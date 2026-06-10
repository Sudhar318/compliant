import { sendNotification, CreateNotificationParams } from "../services/notification.service.ts";

export interface NotificationJob {
  params: CreateNotificationParams;
}

class NotificationBackgroundQueue {
  private queue: NotificationJob[] = [];
  private activelyProcessing = false;

  public add(params: CreateNotificationParams) {
    this.queue.push({ params });
    console.log(`📥 [Notification Queue] Added job for User ${params.userId}. Queue Size: ${this.queue.length}`);
    this.triggerProcessing();
  }

  private triggerProcessing() {
    if (this.activelyProcessing) return;
    this.activelyProcessing = true;

    setImmediate(async () => {
      while (this.queue.length > 0) {
        const currentJob = this.queue.shift();
        if (currentJob) {
          try {
            await sendNotification(currentJob.params);
          } catch (err) {
            console.error(`❌ [Notification Queue] Dispatch failed for User ${currentJob.params.userId}:`, err);
          }
        }
      }
      this.activelyProcessing = false;
    });
  }
}

export const notificationQueue = new NotificationBackgroundQueue();

export function addNotificationJob(params: CreateNotificationParams) {
  notificationQueue.add(params);
}
