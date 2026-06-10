import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().default("file:./dev.db"),
  REDIS_URL: z.string().optional().default("redis://localhost:6379"),
  JWT_SECRET: z.string().default("smarttrack_jwt_super_secret_key_123_456_789"),
  JWT_REFRESH_SECRET: z.string().default("smarttrack_jwt_refresh_super_secret_key_123_456_789"),
  GEMINI_API_KEY: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  PORT: z.string().default("3000").transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", JSON.stringify(parsed.error.format(), null, 2));
  // In dev / test, don't crash, just log and use safe defaults
  if (process.env.NODE_ENV === "production") {
    throw new Error("Missing correct production environment configuration");
  }
}

export const env = parsed.success ? parsed.data : {
  DATABASE_URL: process.env.DATABASE_URL || "file:./dev.db",
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
  JWT_SECRET: process.env.JWT_SECRET || "smarttrack_jwt_super_secret_key_123_456_789",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "smarttrack_jwt_refresh_super_secret_key_123_456_789",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "",
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || "",
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || "",
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || "",
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || "",
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || "",
  PORT: 3000,
  NODE_ENV: "development",
};
