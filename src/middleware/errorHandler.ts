import { Request, Response, NextFunction } from "express";
import { errorResponse } from "../utils/apiResponse.ts";

export function errorHandlerMiddleware(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error("❌ [Global Error Handler]:", err);

  const status = err.status || err.statusCode || 500;
  const message = err.message || "An unexpected error occurred on the server";
  const code = err.code || "INTERNAL_SERVER_ERROR";

  // Respond using the standard API layout
  return errorResponse(res, message, status, code, process.env.NODE_ENV === "development" ? err.stack : undefined);
}
