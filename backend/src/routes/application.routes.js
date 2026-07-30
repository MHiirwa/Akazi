import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  applyToJob,
  withdrawApplication,
  viewJobApplications,
  myApplications,
  updateApplicationStatus,
  reviewApplication,
  employerApplications,
  scheduleInterview
} from "../controllers/application.controller.js";
const router = Router();
router.post("/", requireAuth, requireRole("JOB_SEEKER"), applyToJob);
router.patch("/:id/withdraw", requireAuth, requireRole("JOB_SEEKER"), withdrawApplication);
router.get("/mine", requireAuth, requireRole("JOB_SEEKER"), myApplications);
router.get("/employer", requireAuth, requireRole("EMPLOYER"), employerApplications);
router.get("/job/:jobId", requireAuth, requireRole("EMPLOYER"), viewJobApplications);
router.patch("/:id/status", requireAuth, requireRole("EMPLOYER"), updateApplicationStatus);
router.patch("/:id/review", requireAuth, requireRole("EMPLOYER"), reviewApplication);
router.patch("/:id/interview", requireAuth, requireRole("EMPLOYER"), scheduleInterview);
var application_routes_default = router;
export {
  application_routes_default as default
};
