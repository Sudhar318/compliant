import express from "express";
import path from "path";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer as createViteServer } from "vite";
import { env } from "./src/config/env.ts";
import { errorHandlerMiddleware } from "./src/middleware/errorHandler.ts";
import { globalLimiter } from "./src/middleware/rateLimiter.ts";

// Import modular API routers
import authRouter from "./src/routes/auth.routes.ts";
import complaintRouter from "./src/routes/complaint.routes.ts";
import adminRouter from "./src/routes/admin.routes.ts";
import aiRouter from "./src/routes/ai.routes.ts";
import notificationRouter from "./src/routes/notification.routes.ts";
import { bootstrapDatabase } from "./src/config/db-bootstrap.ts";

async function startServer() {
  // Bootstrap & Self-Heal Database if corrupted or uninitialized
  await bootstrapDatabase();

  const app = express();
  app.set("trust proxy", true);
  const PORT = env.PORT || 3000;

  // 1. Basic global middlewares
  app.use(cors({
    origin: true, // Echo origin back to support relative sandboxes
    credentials: true,
  }));
  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ extended: true, limit: "20mb" }));
  app.use(cookieParser());

  // Apply rate limiter globally to endpoints under /api
  app.use("/api", globalLimiter);

  // 2. Static file serving for user uploads (images, audio, video)
  app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

  // 3. Mount modular API routers
  app.use("/api/auth", authRouter);
  app.use("/api/complaints", complaintRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/notifications", notificationRouter);

  // 4. Base API status endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "healthy",
      service: "SmartTrack TN Backend API",
      timestamp: new Date().toISOString(),
    });
  });

  // 5. Global Error Handling Middleware (must be registered after routers)
  app.use(errorHandlerMiddleware);

  // 6. Integrate React SPA Front-end Builder Middleware
  if (process.env.NODE_ENV !== "production") {
    // Development mode: Inject Vite dev server middleware for real-time compilation
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("⚙️  Vite Dev Middleware injected into Express server.");
  } else {
    // Production mode: Serve pre-built static client files
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("📦 Standalone production mode Active. Serving precompiled visual client.");
  }

  // 7. Bind to PORT and host 0.0.0.0 as required by sandboxed containers
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 [SmartTrack TN Webserver] Listening at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("❌ Critical: Webserver crash during initialization:", error);
  process.exit(1);
});
