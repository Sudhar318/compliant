import { Router } from "express";
import { listNotifications, markAsRead, markAllAsRead } from "../controllers/notification.controller.ts";
import { authMiddleware } from "../middleware/auth.ts";

const router = Router();

router.use(authMiddleware);

router.get("/", listNotifications);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);

export default router;
