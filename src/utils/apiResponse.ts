import { Response } from "express";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}

export function successResponse<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({
    success: true,
    data,
  });
}

export function errorResponse(
  res: Response,
  message: string,
  status = 500,
  code?: string,
  details?: any
) {
  return res.status(status).json({
    success: false,
    error: {
      message,
      code,
      details,
    },
  });
}
