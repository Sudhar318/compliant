import { apiClient } from "./client.ts";
import { Complaint, ComplaintMedia, StatusUpdate, Feedback } from "@prisma/client";

export interface ComplaintDetail extends Complaint {
  media: ComplaintMedia[];
  statusUpdates: (StatusUpdate & {
    updatedBy: {
      name: string;
      role: string;
    };
  })[];
  feedback: Feedback | null;
  assignedOfficer: {
    name: string;
    phone: string;
  } | null;
}

export interface ComplaintListResponse {
  complaints: Complaint[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

function unwrapComplaint<T>(response: T | { complaint: T }): T {
  return response && typeof response === "object" && "complaint" in response
    ? (response as { complaint: T }).complaint
    : response as T;
}

function unwrapMedia<T>(response: T | { media: T }): T {
  return response && typeof response === "object" && "media" in response
    ? (response as { media: T }).media
    : response as T;
}

export async function createComplaint(data: any): Promise<Complaint> {
  const response = await apiClient("/api/complaints", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return unwrapComplaint<Complaint>(response);
}

export async function listComplaints(params: {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  search?: string;
} = {}): Promise<ComplaintListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.append("page", params.page.toString());
  if (params.limit) query.append("limit", params.limit.toString());
  if (params.status) query.append("status", params.status);
  if (params.category) query.append("category", params.category);
  if (params.search) query.append("search", params.search);

  const queryString = query.toString();
  return apiClient(`/api/complaints?${queryString}`, {
    method: "GET",
  });
}

export async function getComplaint(id: string): Promise<ComplaintDetail> {
  const response = await apiClient(`/api/complaints/${id}`, {
    method: "GET",
  });
  return unwrapComplaint<ComplaintDetail>(response);
}

export async function updateStatus(
  id: string,
  data: { status: string; note?: string }
): Promise<{ statusUpdate: StatusUpdate; complaint: Complaint }> {
  return apiClient(`/api/complaints/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function uploadMedia(id: string, formData: FormData): Promise<ComplaintMedia> {
  const response = await apiClient(`/api/complaints/${id}/media`, {
    method: "POST",
    body: formData,
    // Note: client.ts already handles not setting content-type if the body is FormData
  });
  return unwrapMedia<ComplaintMedia>(response);
}

export async function escalate(id: string): Promise<{ complaint: Complaint; statusUpdate: StatusUpdate }> {
  return apiClient(`/api/complaints/${id}/escalate`, {
    method: "POST",
  });
}

export async function submitFeedback(id: string, data: { rating: number; tags: string; comment?: string }): Promise<Feedback> {
  return apiClient(`/api/complaints/${id}/feedback`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function trackPublic(trackingId: string): Promise<ComplaintDetail> {
  const response = await apiClient(`/api/complaints/track/${trackingId}`, {
    method: "GET",
  });
  return unwrapComplaint<ComplaintDetail>(response);
}
