import { prisma } from "./prisma.ts";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

export async function bootstrapDatabase() {
  console.log("🔍 Checking database health and integrity...");
  const dbPath = path.join(process.cwd(), "prisma", "dev.db");

  let isMalformed = false;
  const dbExists = fs.existsSync(dbPath);

  if (!dbExists) {
    console.log("⚠️ Database file does not exist. Initiating generation...");
    isMalformed = true;
  } else {
    try {
      // Test query to verify database is healthy and tables are accessible
      await prisma.user.findFirst();
      console.log("✅ Database health check passed. Integrity is normal.");
    } catch (error: any) {
      const errMsg = error?.message || "";
      console.error("⚠️ Database check failed:", errMsg);
      
      // Check if it's malformed or has some other serious structure issue
      if (
        errMsg.includes("malformed") || 
        errMsg.includes("SqliteError") || 
        errMsg.includes("ConnectorError") ||
        errMsg.includes("does not exist") ||
        errMsg.includes("not found")
      ) {
        console.log("🚨 Malformed or corrupted database detected! Initiating automatic recovery...");
        isMalformed = true;
      } else {
        // Any other database error (like missing tables) can also benefit from push/seed
        console.log("⚠️ Minor schema mismatch or query error detected. Rebuilding schema...");
        isMalformed = true;
      }
    }
  }

  if (isMalformed) {
    try {
      console.log("🔄 Disconnecting active Prisma clients...");
      await prisma.$disconnect();

      // Delete corrupted or incomplete SQLite files
      const filesToDelete = [
        dbPath,
        dbPath + "-journal",
        dbPath + "-wal",
        dbPath + "-shm"
      ];

      for (const file of filesToDelete) {
        if (fs.existsSync(file)) {
          console.log(`🗑️ Deleting file: ${file}`);
          try {
            fs.unlinkSync(file);
          } catch (delErr) {
            console.warn(`Could not delete file ${file}:`, delErr);
          }
        }
      }

      console.log("🏗️ Running 'npx prisma db push --accept-data-loss' to create a healthy schema...");
      execSync("npx prisma db push --accept-data-loss", { stdio: "inherit" });

      console.log("🌱 Database schema rebuilt. Seeding initial data via seed script...");
      execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });

      console.log("✨ Database self-healing complete! Reconnecting clients...");
      // Re-engage connection by doing a simple health check query
      await prisma.user.findFirst();
      console.log("❤️ Reconnection health check passed!");
    } catch (recoveryErr) {
      console.error("❌ Critical: Database self-healing failed:", recoveryErr);
      throw recoveryErr;
    }
  }
}
