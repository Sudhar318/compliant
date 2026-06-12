import { apiClient } from "./client.ts";
import { Complaint, User } from "@prisma/client";

export interface OfficerWithUser {
  id?: string;
  officerId?: string;
  userId: string;
  name?: string;
  phone?: string;
  email?: string | null;
  department: string;
  ward: string;
  district: string;
  activeAssignments: number;
  resolvedCount: number;
  user?: {
    name: string;
    phone: string;
    email: string | null;
  };
}

export interface AdminSummary {
  totals: {
    all: number;
    open: number;
    pending: number;
    assigned: number;
    in_progress: number;
    resolved: number;
    closed: number;
    escalated: number;
  };
  resolutionSpeedAvgHours: number;
  escalationRate: number;
}

export interface AdminTrend {
  month: string;
  filed: number;
  resolved: number;
}

export interface AdminByDept {
  category: string;
  count: number;
  resolved: number;
}

export interface AdminByWard {
  ward: string;
  count: number;
  resolved: number;
}

export async function listComplaints(params: {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
} = {}): Promise<{ complaints: Complaint[]; pagination: any }> {
  const query = new URLSearchParams();
  if (params.page) query.append("page", params.page.toString());
  if (params.limit) query.append("limit", params.limit.toString());
  if (params.status) query.append("status", params.status);
  if (params.category) query.append("category", params.category);

  return apiClient(`/api/admin/complaints?${query.toString()}`, {
    method: "GET",
  });
}

export async function listOfficers(): Promise<OfficerWithUser[]> {
  const response = await apiClient("/api/admin/officers", {
    method: "GET",
  });
  return response.officers || response;
}

export async function assignComplaint(complaintId: string, officerId: string): Promise<{ assignedOfficerId: string }> {
  return apiClient(`/api/admin/complaints/${complaintId}/assign`, {
    method: "PATCH",
    body: JSON.stringify({ officerId }),
  });
}

export async function registerOfficer(data: any): Promise<User> {
  const response = await apiClient("/api/admin/officers", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return response.officer || response;
}

export async function getSummary(): Promise<AdminSummary> {
  return apiClient("/api/admin/analytics/summary", {
    method: "GET",
  });
}

export async function getTrends(): Promise<AdminTrend[]> {
  const response = await apiClient("/api/admin/analytics/trends", {
    method: "GET",
  });
  return response.trends || response;
}

export async function getByDept(): Promise<AdminByDept[]> {
  const response = await apiClient("/api/admin/analytics/by-department", {
    method: "GET",
  });
  return response.departments || response;
}

export async function getByWard(): Promise<AdminByWard[]> {
  const response = await apiClient("/api/admin/analytics/by-ward", {
    method: "GET",
  });
  return response.wards || response;
}
