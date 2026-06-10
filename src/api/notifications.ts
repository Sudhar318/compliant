import { apiClient } from "./client.ts";
import { Notification } from "@prisma/client";

export async function listNotifications(): Promise<{ notifications: Notification[] }> {
  return apiClient("/api/notifications", {
    method: "GET",
  });
}

export async function markRead(id: string): Promise<Notification> {
  return apiClient(`/api/notifications/${id}/read`, {
    method: "PATCH",
  });
}
