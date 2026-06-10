import { PrismaClient } from "@prisma/client";

// Ensure a single PrismaClient instance is used across the application
const prismaGlobal = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

export const prisma = prismaGlobal.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  prismaGlobal.prisma = prisma;
}
