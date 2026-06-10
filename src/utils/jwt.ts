import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env.ts";
import { prisma } from "../config/prisma.ts";

export interface TokenPayload {
  userId: string;
  role: string;
  phone: string;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "15m" });
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
}

export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  const hash = hashToken(token);
  const revoked = await prisma.revokedToken.findUnique({
    where: { tokenHash: hash }
  });
  if (revoked) {
    throw new Error("Token is blacklisted");
  }
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
}

export async function verifyRefreshToken(token: string): Promise<TokenPayload> {
  const hash = hashToken(token);
  const revoked = await prisma.revokedToken.findUnique({
    where: { tokenHash: hash }
  });
  if (revoked) {
    throw new Error("Token is blacklisted");
  }
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
}

export async function blacklistToken(token: string): Promise<void> {
  const hash = hashToken(token);
  const decoded = jwt.decode(token) as any;
  const expiresAt = decoded && decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.revokedToken.upsert({
    where: { tokenHash: hash },
    update: {},
    create: {
      tokenHash: hash,
      expiresAt
    }
  });
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const hash = hashToken(token);
  const revoked = await prisma.revokedToken.findUnique({
    where: { tokenHash: hash }
  });
  return !!revoked;
}

// Cleanup job (runs at startup + every 24h)
export async function cleanupExpiredTokens(): Promise<void> {
  try {
    await prisma.revokedToken.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });
  } catch (error) {
    console.error("Failed to cleanup expired tokens:", error);
  }
}

// Run immediately on load
cleanupExpiredTokens();

// Run every 24 hours
const interval = setInterval(cleanupExpiredTokens, 24 * 60 * 60 * 1000);
if (interval && typeof interval.unref === "function") {
  interval.unref();
}
