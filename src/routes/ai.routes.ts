import { Router } from "express";
import { categoriseOnDemand } from "../controllers/ai.controller.ts";
import { authMiddleware } from "../middleware/auth.ts";
import { aiLimiter } from "../middleware/rateLimiter.ts";

const router = Router();

router.post("/categorise", authMiddleware, aiLimiter, categoriseOnDemand);

export default router;
