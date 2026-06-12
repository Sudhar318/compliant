import { z } from "zod";
import { CATEGORY_VALUES, SUBCATEGORY_VALUES } from "./complaintOptions.ts";

export const LoginSchema = z.object({
  identifier: z.string().min(1, "Phone or Email is required"),
  password: z.string().min(8, "Password must be at least 8 characters")
});

export const RegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().regex(/^\+91[6-9]\d{9}$/, "Invalid phone number. Must start with +91 followed by 10 digits."),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters"),
  ward: z.string().min(1, "Ward is required"),
  district: z.string().min(1, "District is required")
});

export const ComplaintStep1Schema = z.object({
  title: z.string().min(10, "Title must be at least 10 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  category: z.enum(CATEGORY_VALUES),
  subcategory: z.enum(SUBCATEGORY_VALUES),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
});

export const ComplaintStep2Schema = z.object({
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional()
}).refine(data => {
  // Address is required if no GPS coordinates exist
  return data.address || (data.latitude && data.longitude);
}, {
  message: "Street address is required unless dynamic GPS coordinates are resolved",
  path: ["address"]
});
