import { Router } from "express";
import { register, login, refresh, logout, sendOtp, verifyOtp, getMe, updateProfile } from "../controllers/auth.controller.ts";
import { authLimiter } from "../middleware/rateLimiter.ts";
import { authMiddleware } from "../middleware/auth.ts";

const router = Router();

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/refresh", refresh);
router.post("/logout", logout);

router.post("/send-otp", authLimiter, sendOtp);
router.post("/verify-otp", authLimiter, verifyOtp);

router.get("/me", authMiddleware, getMe);
router.patch("/profile", authMiddleware, updateProfile);

export default router;
