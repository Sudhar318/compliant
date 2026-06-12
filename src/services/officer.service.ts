import { prisma } from "../config/prisma.ts";
import { sendNotification } from "./notification.service.ts";

export async function assignOfficerToComplaint(complaintId: string) {
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
  });

  if (!complaint) return;

  const department = complaint.department || "Tamil Nadu Civic Works";
  const ward = complaint.ward || "";
  const district = complaint.district || "";

  // 1. Try to find an officer in the same Department AND Ward with the fewest activeAssignments
  let assignedOfficerRelation = await prisma.officer.findFirst({
    where: {
      department: { contains: department },
      ward: ward,
    },
    orderBy: {
      activeAssignments: "asc",
    },
    include: {
      user: true,
    },
  });

  // 2. If no matching officer in that ward, search department-wide within the same District
  if (!assignedOfficerRelation && district) {
    assignedOfficerRelation = await prisma.officer.findFirst({
      where: {
        department: { contains: department },
        district: district,
      },
      orderBy: {
        activeAssignments: "asc",
      },
      include: {
        user: true,
      },
    });
  }

  // 3. Fallback: Search department-wide anywhere
  if (!assignedOfficerRelation) {
    assignedOfficerRelation = await prisma.officer.findFirst({
      where: {
        department: { contains: department },
      },
      orderBy: {
        activeAssignments: "asc",
      },
      include: {
        user: true,
      },
    });
  }

  if (assignedOfficerRelation) {
    const officerUserId = assignedOfficerRelation.userId;

    // Map and update Database
    await prisma.$transaction([
      prisma.complaint.update({
        where: { id: complaintId },
        data: {
          assignedOfficerId: officerUserId,
          status: "ASSIGNED",
        },
      }),
      prisma.officer.update({
        where: { id: assignedOfficerRelation.id },
        data: {
          activeAssignments: { increment: 1 },
        },
      }),
      prisma.statusUpdate.create({
        data: {
          complaintId,
          status: "ASSIGNED",
          note: `Automatically assigned to Officer ${assignedOfficerRelation.user.name} of ${department} based on ward/load routing.`,
          updatedById: officerUserId, // self
        },
      }),
    ]);

    // Send push / SMS notification to the assigned officer
    await sendNotification({
      userId: officerUserId,
      type: "ASSIGNMENT",
      title: "New Case Assigned",
      message: `TNEB/Govt: Case #${complaint.trackingId} - ${complaint.title} has been routed to you.`,
      complaintId,
    });

    console.log(`📌 Complaint ${complaint.trackingId} auto-assigned to Officer ${assignedOfficerRelation.user.name}`);
  } else {
    // Left unassigned if no officers exist; update log to "OPEN" status update
    await prisma.statusUpdate.create({
      data: {
        complaintId,
        status: "OPEN",
        note: `Complaint registered. Awaiting manual assignment by District administrator.`,
        updatedById: complaint.citizenId, // citizen or system
      },
    });
    console.log(`📌 Complaint ${complaint.trackingId} remains OPEN - no department officers registered yet.`);
  }
}
