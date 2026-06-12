import { Request, Response } from "express";
import { prisma } from "../config/prisma.ts";
import { createComplaintSchema, updateStatusSchema, submitFeedbackSchema } from "../validators/complaint.schema.ts";
import { generateUniqueTrackingId } from "../services/tracking.service.ts";
import { addAIJob } from "../queues/ai.queue.ts";
import { successResponse, errorResponse } from "../utils/apiResponse.ts";
import { AuthenticatedRequest } from "../middleware/auth.ts";
import { uploadFile } from "../services/storage.service.ts";
import { sendNotification } from "../services/notification.service.ts";

export async function createComplaint(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return errorResponse(res, "Authentication required", 401, "UNAUTHORIZED");
    }

    const validated = createComplaintSchema.parse(req.body);

    // Generate unique TN-XXXXX tracking ID
    const trackingId = await generateUniqueTrackingId();

    const complaint = await prisma.complaint.create({
      data: {
        trackingId,
        title: validated.title,
        description: validated.description,
        category: validated.category,
        subcategory: validated.subcategory || null,
        priority: validated.priority,
        status: "OPEN",
        latitude: validated.latitude || null,
        longitude: validated.longitude || null,
        address: validated.address || null,
        ward: validated.ward || null,
        district: validated.district || null,
        citizenId: req.user.userId,
      },
    });

    // Write audit timeline trail: OPEN
    await prisma.statusUpdate.create({
      data: {
        complaintId: complaint.id,
        status: "OPEN",
        note: `Complaint registered. Tracking ID: ${trackingId}. Sent to background core for AI classification.`,
        updatedById: req.user.userId,
      },
    });

    // Schedule AI Queue Job (Processes asynchronous Gemini categorization & auto-officer routing!)
    addAIJob(complaint.id);

    return successResponse(res, {
      message: "Complaint registered successfully and entered analysis pipelines.",
      complaint: {
        id: complaint.id,
        trackingId: complaint.trackingId,
        title: complaint.title,
        category: complaint.category,
        subcategory: complaint.subcategory,
        status: complaint.status,
        createdAt: complaint.createdAt,
      },
    }, 201);
  } catch (err: any) {
    if (err.name === "ZodError") {
      return errorResponse(res, "Validation failed", 400, "VALIDATION_ERROR", err.errors);
    }
    return errorResponse(res, err.message || "Failed to submit new complaint", 500);
  }
}

export async function listComplaints(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return errorResponse(res, "Unauthorized request", 401, "UNAUTHORIZED");

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const skip = (page - 1) * limit;

    const status = req.query.status as string;
    const category = req.query.category as string;
    const priority = req.query.priority as string;

    const whereClause: any = {
      citizenId: req.user.userId,
    };

    if (status) whereClause.status = status;
    if (category) whereClause.category = category;
    if (priority) whereClause.priority = priority;

    const [complaints, total] = await prisma.$transaction([
      prisma.complaint.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          media: true,
          statusUpdates: { orderBy: { createdAt: "desc" } },
        },
      }),
      prisma.complaint.count({ where: whereClause }),
    ]);

    return successResponse(res, {
      complaints,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    return errorResponse(res, err.message || "Failed to fetch complaints", 500);
  }
}

export async function getComplaintById(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: {
        media: true,
        statusUpdates: {
          orderBy: { createdAt: "asc" },
          include: { updatedBy: { select: { name: true, role: true } } },
        },
        feedback: true,
        citizen: { select: { id: true, name: true, phone: true } },
        assignedOfficer: { select: { id: true, name: true, phone: true } },
      },
    });

    if (!complaint) {
      return errorResponse(res, "Complaint case profile not found", 404, "NOT_FOUND");
    }

    return successResponse(res, { complaint });
  } catch (err: any) {
    return errorResponse(res, err.message || "Failed to read case properties", 500);
  }
}

export async function updateComplaintStatus(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return errorResponse(res, "Authentication required", 401, "UNAUTHORIZED");
    const { id } = req.params;
    const validated = updateStatusSchema.parse(req.body);

    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: { assignedOfficer: true },
    });

    if (!complaint) {
      return errorResponse(res, "Complaint not found", 404, "NOT_FOUND");
    }

    // Auth constraints: Only assigned officer or ADMIN can update cases status
    if (req.user.role === "OFFICER" && complaint.assignedOfficerId !== req.user.userId) {
      return errorResponse(res, "Unauthorized: You are not assigned to this complaint case", 403, "FORBIDDEN");
    }

    const completedStatuses = ["RESOLVED", "CLOSED"];
    const resolvedAt = completedStatuses.includes(validated.status) ? new Date() : complaint.resolvedAt;

    // Run within single transaction
    const [updatedComplaint] = await prisma.$transaction([
      prisma.complaint.update({
        where: { id },
        data: {
          status: validated.status,
          resolvedAt,
        },
      }),
      prisma.statusUpdate.create({
        data: {
          complaintId: id,
          status: validated.status,
          note: validated.note || `Status updated to ${validated.status} by ${req.user.role === "ADMIN" ? "Administrator" : "Assigned Officer"}.`,
          updatedById: req.user.userId,
        },
      }),
    ]);

    // If case has been resolved, update stats profile for officer
    if (completedStatuses.includes(validated.status) && !completedStatuses.includes(complaint.status) && complaint.assignedOfficerId) {
      await prisma.officer.updateMany({
        where: { userId: complaint.assignedOfficerId },
        data: {
          activeAssignments: { decrement: 1 },
          resolvedCount: { increment: 1 },
        },
      });
    }

    // Trigger Notification for Citizen
    await sendNotification({
      userId: complaint.citizenId,
      type: "STATUS_UPDATE",
      title: "Complaint Status Updated",
      message: `Your complaint #${complaint.trackingId} status has changed to "${validated.status}". Note: ${validated.note || "No comments from department."}`,
      complaintId: id,
    });

    return successResponse(res, {
      message: "Complaint status updated successfully.",
      status: updatedComplaint.status,
    });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return errorResponse(res, "Invalid status properties", 400, "VALIDATION_ERROR", err.errors);
    }
    return errorResponse(res, err.message || "Failed to update status", 500);
  }
}

export async function uploadComplaintMedia(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    if (!req.file) {
      return errorResponse(res, "Please attach a valid file attachment", 400, "FILE_MISSING");
    }

    const complaint = await prisma.complaint.findUnique({
      where: { id },
    });

    if (!complaint) {
      return errorResponse(res, "Complaint template not found to assign attachments", 404, "NOT_FOUND");
    }

    // Detect media types: PHOTO, VIDEO, AUDIO based on mimetype
    let mediaType: "PHOTO" | "VIDEO" | "AUDIO" = "PHOTO";
    if (req.file.mimetype.startsWith("video/")) mediaType = "VIDEO";
    else if (req.file.mimetype.startsWith("audio/")) mediaType = "AUDIO";

    // Upload to local storage / Cloudinary
    const uploadResult = await uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    const media = await prisma.complaintMedia.create({
      data: {
        complaintId: id,
        type: mediaType,
        url: uploadResult.url,
        publicId: uploadResult.publicId,
      },
    });

    return successResponse(res, {
      message: "Media file uploaded successfully and linked to complaint.",
      media,
    }, 201);
  } catch (err: any) {
    return errorResponse(res, err.message || "Failed to upload and secure media file", 500);
  }
}

export async function escalateComplaint(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return errorResponse(res, "Unauthorized", 401, "UNAUTHORIZED");
    const { id } = req.params;

    const complaint = await prisma.complaint.findUnique({
      where: { id },
    });

    if (!complaint) {
      return errorResponse(res, "Complaint query invalid", 404, "NOT_FOUND");
    }

    // Citizen identity verification
    if (complaint.citizenId !== req.user.userId) {
      return errorResponse(res, "Unauthorized: You are not the owner of this complaint case.", 403, "FORBIDDEN");
    }

    const hoursSinceCreation = (Date.now() - new Date(complaint.createdAt).getTime()) / (1000 * 60 * 60);

    // Guard: Can escalate after 72 hours of no activity or resolution actions
    const canEscalate = hoursSinceCreation >= 72 || ["OPEN", "PENDING"].includes(complaint.status);
    if (!canEscalate) {
      return errorResponse(res, `Failed: Escalation lock active. Support pipelines require 72h window before escalation triggers. Passed: ${hoursSinceCreation.toFixed(1)}h.`, 400, "ESCALATION_COOLDOWN");
    }

    const [updatedComplaint] = await prisma.$transaction([
      prisma.complaint.update({
        where: { id },
        data: { status: "ESCALATED", priority: "CRITICAL" },
      }),
      prisma.statusUpdate.create({
        data: {
          complaintId: id,
          status: "ESCALATED",
          note: "Citizen triggered an escalation. Status upgraded to ESCALATED with CRITICAL priority.",
          updatedById: req.user.userId,
        },
      }),
    ]);

    // Send warning alert notification to assigned officer or admin
    if (complaint.assignedOfficerId) {
      await sendNotification({
        userId: complaint.assignedOfficerId,
        type: "ALERT",
        title: "CASE ESCALATED",
        message: `Urgent attention required: Complaint #${complaint.trackingId} was escalated by citizen. Action needed immediately.`,
        complaintId: id,
      });
    }

    return successResponse(res, {
      message: "Complaint has been escalated on core network. Priority bumped to CRITICAL.",
      status: updatedComplaint.status,
    });
  } catch (err: any) {
    return errorResponse(res, err.message || "Failed to handle escalation workflow", 500);
  }
}

export async function submitComplaintFeedback(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return errorResponse(res, "Authorization required", 401, "UNAUTHORIZED");
    const { id } = req.params;
    const validated = submitFeedbackSchema.parse(req.body);

    const complaint = await prisma.complaint.findUnique({
      where: { id },
    });

    if (!complaint) {
      return errorResponse(res, "Complaint not found", 404, "NOT_FOUND");
    }

    if (complaint.citizenId !== req.user.userId) {
      return errorResponse(res, "Unauthorized feedback request profile", 403, "FORBIDDEN");
    }

    // Guard: Can submit rating only after resolved status
    if (complaint.status !== "RESOLVED" && complaint.status !== "CLOSED") {
      return errorResponse(res, "Feedback rejected: Feedback can only be submitted for RESOLVED or CLOSED complaints.", 400, "CASE_NOT_RESOLVED");
    }

    const tagsString = validated.tags.join(",");

    const feedback = await prisma.feedback.create({
      data: {
        complaintId: id,
        citizenId: req.user.userId,
        rating: validated.rating,
        tags: tagsString,
        comment: validated.comment || null,
      },
    });

    // Close complaint automatically upon receiving positive citizen feedback
    await prisma.complaint.update({
      where: { id },
      data: { status: "CLOSED" },
    });

    return successResponse(res, {
      message: "Positive feedback logged under service database. Case is now closed.",
      feedback,
    }, 201);
  } catch (err: any) {
    if (err.name === "ZodError") {
      return errorResponse(res, "Invalid rating attributes", 400, "VALIDATION_ERROR", err.errors);
    }
    return errorResponse(res, err.message || "Failed to record feedback details", 500);
  }
}

export async function trackComplaintPublic(req: Request, res: Response) {
  try {
    const { trackingId } = req.params;

    const complaint = await prisma.complaint.findUnique({
      where: { trackingId },
      include: {
        media: { select: { id: true, type: true, url: true } },
        statusUpdates: {
          orderBy: { createdAt: "asc" },
          select: { id: true, status: true, note: true, createdAt: true },
        },
      },
    });

    if (!complaint) {
      return errorResponse(res, "Could not locate a complaint case with this tracking code", 404, "NOT_FOUND");
    }

    // Filter-out sensitive elements before returning (No names or numbers exposed to anonymous tracking calls)
    const publicComplaint = {
      trackingId: complaint.trackingId,
      title: complaint.title,
      description: complaint.description,
      category: complaint.category,
      priority: complaint.priority,
      status: complaint.status,
      address: complaint.address,
      ward: complaint.ward,
      district: complaint.district,
      createdAt: complaint.createdAt,
      media: complaint.media,
      statusUpdates: complaint.statusUpdates,
    };

    return successResponse(res, { complaint: publicComplaint });
  } catch (err: any) {
    return errorResponse(res, err.message || "Failed to fetch public complaint tracking information", 500);
  }
}
