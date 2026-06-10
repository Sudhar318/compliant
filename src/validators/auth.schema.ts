import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long"),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number with optional country code"),
  email: z.string().email("Please enter a valid email address").optional().nullable(),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  role: z.enum(["CITIZEN", "OFFICER", "ADMIN"]).default("CITIZEN"),
  ward: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
});

export const loginSchema = z.object({
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional(),
  password: z.string().min(1, "Password is required"),
}).refine((data) => data.phone || data.email, {
  message: "Either phone or email must be provided to sign in",
  path: ["phone"],
});

export const sendOtpSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number"),
});

export const verifyOtpSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number"),
  code: z.string().length(6, "OTP code must be exactly 6 digits"),
});
