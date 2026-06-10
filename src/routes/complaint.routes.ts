import { Router } from "express";
import {
  createComplaint,
  listComplaints,
  getComplaintById,
  updateComplaintStatus,
  uploadComplaintMedia,
  escalateComplaint,
  submitComplaintFeedback,
  trackComplaintPublic,
} from "../controllers/complaint.controller.ts";
import { authMiddleware, roleGuard } from "../middleware/auth.ts";
import { upload } from "../middleware/upload.ts";

const router = Router();

// Public route: unauthenticated complaint status tracking by TN-XXXXX tracking ID
router.get("/track/:trackingId", trackComplaintPublic);

// Secure routes (requires valid citizen, officer, or admin session)
router.use(authMiddleware);

router.post("/", roleGuard(["CITIZEN"]), createComplaint);
router.get("/", roleGuard(["CITIZEN"]), listComplaints);

router.get("/:id", getComplaintById);
router.patch("/:id/status", roleGuard(["OFFICER", "ADMIN"]), updateComplaintStatus);
router.post("/:id/media", upload.single("file"), uploadComplaintMedia);
router.post("/:id/escalate", roleGuard(["CITIZEN"]), escalateComplaint);
router.post("/:id/feedback", roleGuard(["CITIZEN"]), submitComplaintFeedback);

export default router;
