import { Request, Response, NextFunction } from "express";
import { errorResponse } from "../utils/apiResponse.ts";
import { AuthenticatedRequest } from "./auth.ts";

interface LimitRecord {
  hits: number;
  resetAt: number;
}

const memoryStore = new Map<string, LimitRecord>();

export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message: string;
  keyPrefix?: string;
  byUser?: boolean;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === "test") {
      return next();
    }
    const authReq = req as AuthenticatedRequest;
    const keyIdentifier = options.byUser && authReq.user
      ? authReq.user.userId
      : req.ip || "unknown-ip";

    const prefix = options.keyPrefix || "global";
    const storeKey = `${prefix}:${keyIdentifier}`;

    const now = Date.now();
    const existing = memoryStore.get(storeKey);

    if (!existing || now > existing.resetAt) {
      // Create new window
      memoryStore.set(storeKey, {
        hits: 1,
        resetAt: now + options.windowMs,
      });
      return next();
    }

    if (existing.hits >= options.max) {
      const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);
      res.setHeader("Retry-After", retryAfterSeconds);
      return errorResponse(res, options.message, 429, "RATE_LIMIT_EXCEEDED", {
        retryAfterSeconds,
      });
    }

    existing.hits += 1;
    memoryStore.set(storeKey, existing);
    next();
  };
}

// Global Limiter: 2000 req per 15 min per IP
export const globalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  message: "Too many requests, please try again in 15 minutes.",
  keyPrefix: "global",
});

// Auth Limiter: 300 req per 15 min per IP
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: "Too many authentication requests, please check credentials and try again in 15 minutes.",
  keyPrefix: "auth",
});

// AI Limiter: 10 req per min per User
export const aiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: "AI analysis limit reached (10 requests per minute). Please check back in a few seconds.",
  keyPrefix: "ai",
  byUser: true,
});
