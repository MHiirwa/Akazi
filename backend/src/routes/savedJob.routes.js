import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { saveJob, listSavedJobs, unsaveJob } from "../controllers/savedJob.controller.js";

const router = Router();
router.get("/", requireAuth, requireRole("JOB_SEEKER"), listSavedJobs);
router.post("/", requireAuth, requireRole("JOB_SEEKER"), saveJob);
router.delete("/:jobId", requireAuth, requireRole("JOB_SEEKER"), unsaveJob);

export default router;
