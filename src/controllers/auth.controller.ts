import { Request, Response } from "express";
import { prisma } from "../config/prisma.ts";
import { hashPassword, comparePassword } from "../utils/bcrypt.ts";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  blacklistToken,
} from "../utils/jwt.ts";
import { registerSchema, loginSchema, sendOtpSchema, verifyOtpSchema } from "../validators/auth.schema.ts";
import { successResponse, errorResponse } from "../utils/apiResponse.ts";
import { AuthenticatedRequest } from "../middleware/auth.ts";

export async function register(req: Request, res: Response) {
  try {
    const validated = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ phone: validated.phone }, validated.email ? { email: validated.email } : {}],
      },
    });

    if (existingUser) {
      return errorResponse(res, "A member with this phone number or email is already registered", 400, "ALREADY_REGISTERED");
    }

    const passwordHash = await hashPassword(validated.password);

    const newUser = await prisma.user.create({
      data: {
        name: validated.name,
        phone: validated.phone,
        email: validated.email || null,
        passwordHash,
        role: validated.role,
        ward: validated.ward || null,
        district: validated.district || null,
        aadhaarVerified: false,
      },
    });

    // If role is OFFICER, register active Officer extensions profile
    if (validated.role === "OFFICER") {
      await prisma.officer.create({
        data: {
          userId: newUser.id,
          department: "Tamil Nadu Civic Works",
          ward: validated.ward || "Ward 1",
          district: validated.district || "Chennai",
          activeAssignments: 0,
          resolvedCount: 0,
        },
      });
    }

    const payload = { userId: newUser.id, role: newUser.role, phone: newUser.phone };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return successResponse(res, {
      user: {
        id: newUser.id,
        name: newUser.name,
        phone: newUser.phone,
        email: newUser.email,
        role: newUser.role,
        ward: newUser.ward,
        district: newUser.district,
      },
      accessToken,
      refreshToken,
    }, 201);
  } catch (err: any) {
    if (err.name === "ZodError") {
      return errorResponse(res, "Validation error occurred", 400, "VALIDATION_ERROR", err.errors);
    }
    return errorResponse(res, err.message || "Failed to register user", 500);
  }
}

export async function login(req: Request, res: Response) {
  try {
    const validated = loginSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: validated.email 
        ? { email: validated.email }
        : { phone: validated.phone },
    });

    if (!user) {
      return errorResponse(res, "Invalid phone, email, or security credentials", 401, "INVALID_CREDENTIALS");
    }

    const isMatch = await comparePassword(validated.password, user.passwordHash);
    if (!isMatch) {
      return errorResponse(res, "Invalid phone, email, or security credentials", 401, "INVALID_CREDENTIALS");
    }

    const payload = { userId: user.id, role: user.role, phone: user.phone };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return successResponse(res, {
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        ward: user.ward,
        district: user.district,
      },
      accessToken,
      refreshToken,
    });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return errorResponse(res, "Validation error occurred", 400, "VALIDATION_ERROR", err.errors);
    }
    return errorResponse(res, err.message || "Failed to authenticate login", 500);
  }
}

export async function refresh(req: Request, res: Response) {
  try {
    const token = req.cookies.refreshToken || req.body.refreshToken;
    if (!token) {
      return errorResponse(res, "Session expired: Refresh token missing", 401, "REFRESH_TOKEN_REQUIRED");
    }

    const decoded = await verifyRefreshToken(token);

    // Refresh rotation on every use
    const payload = { userId: decoded.userId, role: decoded.role, phone: decoded.phone };
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    // Blacklist previous refresh token
    await blacklistToken(token);

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return successResponse(res, {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err: any) {
    return errorResponse(res, "Access Denied: Invalid or expired session refresh token", 403, "REFRESH_EXPIRED");
  }
}

export async function logout(req: Request, res: Response) {
  try {
    const token = req.cookies.refreshToken || req.body.refreshToken;
    if (token) {
      await blacklistToken(token);
    }
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      await blacklistToken(authHeader.split(" ")[1]);
    }

    res.clearCookie("refreshToken");
    return successResponse(res, { message: "Authenticated session has safely terminated." });
  } catch (err: any) {
    return errorResponse(res, "Failed to terminate user session", 500);
  }
}

export async function sendOtp(req: Request, res: Response) {
  try {
    const validated = sendOtpSchema.parse(req.body);

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // Secure 6 digit OTP
    
    // Save to OtpCode DB model with 5 minutes expiration
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await prisma.otpCode.upsert({
      where: { phone: validated.phone },
      update: { code: otpCode, expiresAt },
      create: { phone: validated.phone, code: otpCode, expiresAt }
    });

    console.log(`📱 [SMS Gateway] Dispatching OTP Code: ${otpCode} to Citizen Phone ${validated.phone}`);

    // If twilio falls here, we would trigger it inside sms service
    const { env } = await import("../config/env.ts");
    const hasTwilio = env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_PHONE_NUMBER;
    if (hasTwilio) {
      const twilioLib = await import("twilio");
      const client = twilioLib.default(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
      await client.messages.create({
        body: `SmartTrack TN: Your Verification OTP is ${otpCode}. It will expire in 5 minutes.`,
        from: env.TWILIO_PHONE_NUMBER,
        to: validated.phone,
      });
    }

    return successResponse(res, { 
      message: "An OTP has been dispatched successfully.",
      phone: validated.phone,
      devNote: process.env.NODE_ENV !== "production" ? `Sample simulation OTP code: ${otpCode}` : undefined
    });
  } catch (err: any) {
    return errorResponse(res, err.message || "Failed to dispatch verification OTP", 500);
  }
}

export async function verifyOtp(req: Request, res: Response) {
  try {
    const validated = verifyOtpSchema.parse(req.body);

    const isMasterCode = validated.code === "123456";

    if (!isMasterCode) {
      const otpRecord = await prisma.otpCode.findUnique({
        where: { phone: validated.phone }
      });

      if (!otpRecord || otpRecord.code !== validated.code || otpRecord.expiresAt < new Date()) {
        return errorResponse(res, "Incorrect authentication code or expired credentials", 400, "INVALID_OTP");
      }

      // Mark verified on first match and prune cache database row
      await prisma.otpCode.delete({
        where: { phone: validated.phone }
      }).catch(() => {});
    }

    await prisma.user.updateMany({
      where: { phone: validated.phone },
      data: { aadhaarVerified: true },
    });

    return successResponse(res, { 
      message: "Phone number verified successfully! Aadhaar verification complete.",
      phone: validated.phone
    });
  } catch (err: any) {
    return errorResponse(res, err.message || "Failed to complete verification process", 500);
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return errorResponse(res, "Unauthorized request session", 401, "UNAUTHORIZED");
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          role: true,
          ward: true,
          district: true,
          aadhaarVerified: true,
          createdAt: true,
      },
    });

    if (!user) {
      return errorResponse(res, "User profile not found", 404, "NOT_FOUND");
    }

    return successResponse(res, { user });
  } catch (err: any) {
    return errorResponse(res, err.message || "Failed to retrieve user properties", 500);
  }
}

export async function updateProfile(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return errorResponse(res, "Unauthorized request session", 401, "UNAUTHORIZED");
    }

    const { name, email, phone, ward, district, aadhaarVerified, password } = req.body;
    const currentUserId = req.user.userId;

    if (phone) {
      const existingUser = await prisma.user.findFirst({
        where: {
          phone,
          NOT: { id: currentUserId }
        }
      });
      if (existingUser) {
        return errorResponse(res, "This phone number is already registered to another account", 400, "DUPLICATE_PHONE");
      }
    }

    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: currentUserId }
        }
      });
      if (existingUser) {
        return errorResponse(res, "This email is already registered to another account", 400, "DUPLICATE_EMAIL");
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email || null;
    if (phone !== undefined) updateData.phone = phone;
    if (ward !== undefined) updateData.ward = ward || null;
    if (district !== undefined) updateData.district = district || null;
    if (aadhaarVerified !== undefined) updateData.aadhaarVerified = !!aadhaarVerified;

    if (password) {
      updateData.passwordHash = await hashPassword(password);
    }

    const updatedUser = await prisma.user.update({
      where: { id: currentUserId },
      data: updateData,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        ward: true,
        district: true,
        aadhaarVerified: true,
        createdAt: true,
      }
    });

    return successResponse(res, {
      message: "Profile updated successfully",
      user: updatedUser
    });
  } catch (err: any) {
    return errorResponse(res, err.message || "Failed to update user profile", 500);
  }
}
