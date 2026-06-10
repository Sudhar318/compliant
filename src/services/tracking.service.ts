import { prisma } from "../config/prisma.ts";

export async function generateUniqueTrackingId(): Promise<string> {
  const maxRetries = 10;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const randomDigits = Math.floor(10000 + Math.random() * 90000); // 5 digits
    const trackingId = `TN-${randomDigits}`;

    const existing = await prisma.complaint.findUnique({
      where: { trackingId },
    });

    if (!existing) {
      return trackingId;
    }
  }
  throw new Error("Failed to generate a unique tracking ID after max retries");
}
