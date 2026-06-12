import { analyzeComplaint } from "../services/gemini.service.ts";
import { assignOfficerToComplaint } from "../services/officer.service.ts";
import { prisma } from "../config/prisma.ts";
import { sendNotification } from "../services/notification.service.ts";
import { normalizeCategoryValue } from "../lib/complaintOptions.ts";

export interface AIJob {
  complaintId: string;
}

// Highly reliable, non-blocking asynchronous event loop queue
// Handles background processing without requiring external Redis instances
class AIBackgroundQueue {
  private queue: AIJob[] = [];
  private activelyProcessing = false;

  public add(job: AIJob) {
    this.queue.push(job);
    console.log(`📥 [AI Queue] Added job for Complaint ${job.complaintId}. Queue Size: ${this.queue.length}`);
    this.triggerProcessing();
  }

  private triggerProcessing() {
    if (this.activelyProcessing) return;
    this.activelyProcessing = true;
    
    // Process items in background async task to avoid halting the main thread
    setImmediate(async () => {
      while (this.queue.length > 0) {
        const currentJob = this.queue.shift();
        if (currentJob) {
          try {
            await this.processJob(currentJob);
          } catch (err) {
            console.error(`❌ [AI Queue] Failed to process job for complaint ${currentJob.complaintId}:`, err);
          }
        }
      }
      this.activelyProcessing = false;
    });
  }

  private async processJob(job: AIJob) {
    const { complaintId } = job;
    console.log(`⚙️ [AI Queue] Starting analysis for Complaint ${complaintId}`);

    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      include: { media: true },
    });

    if (!complaint) {
      console.warn(`[AI Queue] Job skipped: Complaint ${complaintId} not found in database.`);
      return;
    }

    // Extract image URLs if any
    const imageUrls = complaint.media
      .filter((m) => m.type === "PHOTO")
      .map((m) => m.url);

    // Call Gemini Service for Categorisation
    const analysisResult = await analyzeComplaint(complaint.description, imageUrls);
    const normalizedCategory = normalizeCategoryValue(analysisResult.category);

    // Persist Analysis Results in Database
    await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        category: normalizedCategory,
        department: analysisResult.department,
        priority: analysisResult.priority,
        sentiment: analysisResult.sentiment,
        aiSummary: analysisResult.aiSummary,
        estimatedResolutionHours: analysisResult.estimatedResolutionHours,
      },
    });

    console.log(`🤖 [AI Queue] Completed analysis for ${complaint.trackingId}. Generated AI Summary.`);

    // Launch Auto-Routing Assignment Flow
    await assignOfficerToComplaint(complaintId);

    // Notify Citizen of Successful Categorization
    await sendNotification({
      userId: complaint.citizenId,
      type: "STATUS_UPDATE",
      title: "Complaint Categorized",
      message: `Your complaint has been categorized under '${normalizedCategory}' and routed to target departments. Code: ${complaint.trackingId}`,
      complaintId,
    });
  }
}

export const aiQueue = new AIBackgroundQueue();

// Standard wrapper
export function addAIJob(complaintId: string) {
  aiQueue.add({ complaintId });
}
