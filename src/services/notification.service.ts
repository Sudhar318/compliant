import { prisma } from "../config/prisma.ts";
import { env } from "../config/env.ts";

export interface CreateNotificationParams {
  userId: string;
  type: "STATUS_UPDATE" | "ASSIGNMENT" | "ALERT" | "SYSTEM";
  title: string;
  message: string;
  complaintId?: string;
}

export async function sendNotification(params: CreateNotificationParams) {
  // 1. Create and persist Notification in Database
  const notification = await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      complaintId: params.complaintId,
    },
  });

  // 2. Fetch User to get phone number
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
  });

  if (!user) return notification;

  console.log(`📡 [Notification] Sent to User ${user.name} (${user.phone}): [${params.title}] - ${params.message}`);

  // 3. Optional: Send SMS via Twilio if keys are present
  const hasTwilio = env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_PHONE_NUMBER;
  if (hasTwilio) {
    try {
      const twilioLib = await import("twilio");
      const client = twilioLib.default(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

      await client.messages.create({
        body: `SmartTrack TN: ${params.title}. ${params.message}`,
        from: env.TWILIO_PHONE_NUMBER,
        to: user.phone,
      });
      console.log(`📲 SMS sent successfully to ${user.phone}`);
    } catch (err) {
      console.error("❌ Twilio dispatch failed. Falls back gracefully:", err);
    }
  }

  return notification;
}
