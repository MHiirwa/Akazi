import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  createJob,
  searchJobs,
  getJob,
  updateJob,
  deleteJob,
  myJobs,
  jobApplicantCounts,
  employerAnalytics
} from "../controllers/job.controller.js";
import { jobStats } from "../controllers/stats.controller.js";
const router = Router();
router.get("/", searchJobs);
router.post("/", requireAuth, requireRole("EMPLOYER"), createJob);
router.delete("/:id", requireAuth, requireRole("EMPLOYER"), deleteJob);
router.patch("/:id", requireAuth, requireRole("EMPLOYER"), updateJob);
router.get("/mine/list", requireAuth, requireRole("EMPLOYER"), myJobs);
router.get("/mine/applicant-counts", requireAuth, requireRole("EMPLOYER"), jobApplicantCounts);
router.get("/mine/analytics", requireAuth, requireRole("EMPLOYER"), employerAnalytics);
router.get("/stats", jobStats);
router.get("/:id", getJob);
var job_routes_default = router;
export {
  job_routes_default as default
};
