import { Router } from "express";
import {
  manageListAllComplaints,
  assignOfficer,
  manageListAllOfficers,
  manageCreateOfficer,
  getAnalyticsSummary,
  getAnalyticsTrends,
  getAnalyticsByDepartment,
  getAnalyticsByWard,
} from "../controllers/admin.controller.ts";
import { authMiddleware, roleGuard } from "../middleware/auth.ts";

const router = Router();

router.use(authMiddleware);
router.use(roleGuard(["ADMIN"]));

// Complaints admin controls
router.get("/complaints", manageListAllComplaints);
router.patch("/complaints/:id/assign", assignOfficer);

// Officers admin roster
router.get("/officers", manageListAllOfficers);
router.post("/officers", manageCreateOfficer);

// Deep analytical statistics endpoints
router.get("/analytics/summary", getAnalyticsSummary);
router.get("/analytics/trends", getAnalyticsTrends);
router.get("/analytics/by-department", getAnalyticsByDepartment);
router.get("/analytics/by-ward", getAnalyticsByWard);

export default router;
