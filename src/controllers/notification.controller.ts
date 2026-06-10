import { Response } from "express";
import { prisma } from "../config/prisma.ts";
import { successResponse, errorResponse } from "../utils/apiResponse.ts";
import { AuthenticatedRequest } from "../middleware/auth.ts";

export async function listNotifications(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return errorResponse(res, "Authorization required", 401, "UNAUTHORIZED");

    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(res, { notifications });
  } catch (err: any) {
    return errorResponse(res, err.message || "Failed to list personal notifications", 500);
  }
}

export async function markAsRead(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    if (!req.user) return errorResponse(res, "Authorization required", 401, "UNAUTHORIZED");

    const baseNotify = await prisma.notification.findUnique({ where: { id } });
    if (!baseNotify || baseNotify.userId !== req.user.userId) {
      return errorResponse(res, "Notification record not found", 404, "NOT_FOUND");
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    return successResponse(res, { notification: updated });
  } catch (err: any) {
    return errorResponse(res, err.message || "Failed to update notification state", 500);
  }
}

export async function markAllAsRead(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return errorResponse(res, "Authorization required", 401, "UNAUTHORIZED");

    await prisma.notification.updateMany({
      where: { userId: req.user.userId, read: false },
      data: { read: true },
    });

    return successResponse(res, { message: "All notifications declared as read." });
  } catch (err: any) {
    return errorResponse(res, err.message || "Failed to commit notifications update", 500);
  }
}
