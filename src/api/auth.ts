import { apiClient } from "./client.ts";
import { User } from "@prisma/client";

export interface AuthResponse {
  user: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    role: string;
    ward: string | null;
    district: string | null;
    aadhaarVerified?: boolean;
  };
  accessToken: string;
  refreshToken: string;
}

export async function login(credentials: any): Promise<AuthResponse> {
  return apiClient("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export async function register(data: any): Promise<AuthResponse> {
  return apiClient("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function logout(): Promise<{ message: string }> {
  return apiClient("/api/auth/logout", {
    method: "POST",
  });
}

export async function refresh(token: string): Promise<{ accessToken: string; refreshToken: string }> {
  return apiClient("/api/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken: token }),
  });
}

export async function sendOtp(phone: string): Promise<{ message: string; phone: string; devNote?: string }> {
  return apiClient("/api/auth/send-otp", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOtp(phone: string, code: string): Promise<{ message: string; phone: string }> {
  return apiClient("/api/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ phone, code }),
  });
}

export async function getMe(): Promise<{ user: Partial<User> }> {
  return apiClient("/api/auth/me", {
    method: "GET",
  });
}

export async function updateProfile(data: {
  name?: string;
  email?: string | null;
  phone?: string;
  ward?: string | null;
  district?: string | null;
  aadhaarVerified?: boolean;
  password?: string;
}): Promise<{ message: string; user: any }> {
  return apiClient("/api/auth/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
