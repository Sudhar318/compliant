import { z } from "zod";
import { CATEGORY_VALUES, STATUS_VALUES, SUBCATEGORY_VALUES } from "../lib/complaintOptions.ts";

export const createComplaintSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters long"),
  description: z.string().min(10, "Description must be at least 10 characters long"),
  category: z.enum(CATEGORY_VALUES).default("ROADS"),
  subcategory: z.enum(SUBCATEGORY_VALUES).optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("LOW"),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  address: z.string().optional().nullable(),
  ward: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
});

export const updateStatusSchema = z.object({
  status: z.enum(STATUS_VALUES),
  note: z.string().max(500, "Note must be under 500 characters").optional(),
});

export const submitFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5, "Rating must be between 1 and 5"),
  tags: z.array(z.string()).default([]),
  comment: z.string().optional().nullable(),
});

export const assignOfficerSchema = z.object({
  officerId: z.string().uuid("Invalid Officer User ID"),
});

export const registerOfficerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  email: z.string().email().optional().nullable(),
  password: z.string().min(6),
  department: z.string().min(1),
  ward: z.string().min(1),
  district: z.string().min(1),
});
