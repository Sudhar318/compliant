import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt.ts";
import { errorResponse } from "../utils/apiResponse.ts";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: string;
    phone: string;
  };
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return errorResponse(res, "Access Denied: No Token Provided", 401, "UNAUTHORIZED");
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = await verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (err: any) {
    return errorResponse(res, "Access Denied: Invalid or Expired Token", 403, "TOKEN_EXPIRED");
  }
}

export function roleGuard(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return errorResponse(res, "Access Denied: User Unauthenticated", 401, "UNAUTHORIZED");
    }

    if (!roles.includes(req.user.role)) {
      return errorResponse(res, "Access Denied: Insufficient Privileges", 403, "FORBIDDEN");
    }

    next();
  };
}
