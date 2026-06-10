import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import express from "express";
import cookieParser from "cookie-parser";
import { hashPassword, comparePassword } from "../utils/bcrypt.ts";
import { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken, blacklistToken } from "../utils/jwt.ts";
import { generateUniqueTrackingId } from "../services/tracking.service.ts";
import { analyzeComplaint } from "../services/gemini.service.ts";
import authRouter from "../routes/auth.routes.ts";
import { prisma } from "../config/prisma.ts";

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRouter);

async function deleteUserByPhones(phones: string[]) {
  const users = await prisma.user.findMany({
    where: { phone: { in: phones } },
    select: { id: true }
  });
  const userIds = users.map(u => u.id);
  if (userIds.length > 0) {
    await prisma.officer.deleteMany({
      where: { userId: { in: userIds } }
    });
    await prisma.notification.deleteMany({
      where: { userId: { in: userIds } }
    });
    await prisma.feedback.deleteMany({
      where: { citizenId: { in: userIds } }
    });
    await prisma.statusUpdate.deleteMany({
      where: { updatedById: { in: userIds } }
    });
    await prisma.complaint.deleteMany({
      where: {
        OR: [
          { citizenId: { in: userIds } },
          { assignedOfficerId: { in: userIds } }
        ]
      }
    });
    await prisma.user.deleteMany({
      where: { id: { in: userIds } }
    });
  }
}

beforeAll(async () => {
  // Inject test environment variable
  process.env.NODE_ENV = "test";
  
  // Cleanup test users if they exist
  await deleteUserByPhones(["+919999999999", "+918888888888"]);
  await prisma.otpCode.deleteMany({
    where: { phone: "+919999999999" }
  });
});

afterAll(async () => {
  // Cleanup test users
  await deleteUserByPhones(["+919999999999", "+918888888888"]);
  await prisma.otpCode.deleteMany({
    where: { phone: "+919999999999" }
  });
  await prisma.$disconnect();
});

describe("🔒 Security & Password Hashing", () => {
  it("should successfully hash a cleartext password", async () => {
    const rawPass = "TamilNadu2026_Secure";
    const hash = await hashPassword(rawPass);
    
    expect(hash).toBeDefined();
    expect(hash).not.toEqual(rawPass);
    
    // Support standard bcrypt/bcryptjs prefix formats
    const hasValidSaltPrefix = hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$");
    expect(hasValidSaltPrefix).toBe(true);
  });

  it("should correctly validate matched passwords and reject mismatches", async () => {
    const rawPass = "TNEB_OfficerPass";
    const hash = await hashPassword(rawPass);

    const isMatch = await comparePassword(rawPass, hash);
    const isWrongMatch = await comparePassword("WrongPassHere", hash);

    expect(isMatch).toBe(true);
    expect(isWrongMatch).toBe(false);
  });
});

describe("🔑 JWT Authentication Pipeline", () => {
  const samplePayload = {
    userId: "test-citizen-uuid-12345",
    role: "CITIZEN",
    phone: "+919876543210",
  };

  it("should generate valid access and refresh tokens", () => {
    const access = generateAccessToken(samplePayload);
    const refresh = generateRefreshToken(samplePayload);

    expect(access).toBeDefined();
    expect(refresh).toBeDefined();
    expect(typeof access).toBe("string");
    expect(typeof refresh).toBe("string");
  });

  it("should successfully verify signed tokens and extract payloads", async () => {
    const token = generateAccessToken(samplePayload);
    const decoded = await verifyAccessToken(token);

    expect(decoded.userId).toEqual(samplePayload.userId);
    expect(decoded.role).toEqual(samplePayload.role);
    expect(decoded.phone).toEqual(samplePayload.phone);
  });

  it("should reject blacklisted tokens from further system calls", async () => {
    const token = generateAccessToken(samplePayload);
    
    // Assert active
    const activeDecoded = await verifyAccessToken(token);
    expect(activeDecoded).toBeDefined();

    // Blacklist token
    await blacklistToken(token);

    // Verify should now fail
    await expect(verifyAccessToken(token)).rejects.toThrow("Token is blacklisted");
  });
});

describe("🆔 Tracking ID Generation", () => {
  it("should generate unique tracking codes matching the TN-XXXXX formatting rules", async () => {
    const trackingId = await generateUniqueTrackingId();

    expect(trackingId).toBeDefined();
    expect(trackingId.startsWith("TN-")).toBe(true);
    expect(trackingId.length).toBe(8); // "TN-" (3) + 5 random digits (5) = 8 characters
    
    const digitsOnly = trackingId.split("-")[1];
    expect(/^\d+$/.test(digitsOnly)).toBe(true);
  });
});

describe("🤖 Rule-based Fallback Civic Analyzer (Gemini Fallback)", () => {
  const allowedPriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
  const allowedSentiments = ["Routine", "Concerned", "Urgent", "Emergency"];

  it("should correctly categorize road issues", async () => {
    const desc = "Huge potholes in T-Nagar roads have caused scooter accidents.";
    const analysis = await analyzeComplaint(desc);

    // Category should be ROADS
    expect(analysis.category).toEqual("ROADS");
    expect(typeof analysis.department).toBe("string");
    expect(analysis.department.length).toBeGreaterThan(0);
    
    // Flexibly assert priority list
    expect(allowedPriorities).toContain(analysis.priority);
    expect([24, 48, 72, 168]).toContain(analysis.estimatedResolutionHours);
  });

  it("should correctly route power wire danger complaints", async () => {
    const desc = "Live electricity wire dangling from transformer near school.";
    const analysis = await analyzeComplaint(desc);

    expect(analysis.category).toEqual("ELECTRICITY");
    expect(typeof analysis.department).toBe("string");
    expect(analysis.department.length).toBeGreaterThan(0);
    
    expect(allowedPriorities).toContain(analysis.priority);
    expect(allowedSentiments).toContain(analysis.sentiment);
  });
});

describe("🌐 Supertest Integration Tests: Auth Endpoints", () => {
  it("should successfully register a new user under POST /api/auth/register", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Supertest Citizen",
        phone: "+919999999999",
        email: "supertest@gmail.com",
        password: "password123",
        role: "CITIZEN",
        ward: "Ward B",
        district: "Chennai"
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.phone).toBe("+919999999999");
  });

  it("should successfully authenticate a user via POST /api/auth/login", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        phone: "+919999999999",
        password: "password123"
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("should successfully rotate session tokens via POST /api/auth/refresh", async () => {
    // 1. Get cookies via login
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        phone: "+919999999999",
        password: "password123"
      });
    const cookie = loginRes.headers["set-cookie"];

    // 2. Perform rotation call with refresh cookie
    const refreshRes = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", cookie as unknown as string[])
      .send();

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.success).toBe(true);
    expect(refreshRes.body.data.accessToken).toBeDefined();
  });

  it("should terminate user sessions and invalidate tokens via POST /api/auth/logout", async () => {
    // 1. Login to obtain clean session variables
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        phone: "+919999999999",
        password: "password123"
      });
    const cookie = loginRes.headers["set-cookie"];
    const token = loginRes.body.data.accessToken;

    // 2. Invalidate session via logout endpoint
    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${token}`)
      .set("Cookie", cookie as unknown as string[])
      .send();

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);
  });
});
