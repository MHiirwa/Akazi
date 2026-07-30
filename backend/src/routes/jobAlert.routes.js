import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { subscribe, unsubscribe, getMyAlert, saveMyAlert, deleteMyAlert } from "../controllers/jobAlert.controller.js";
const router = Router();
router.post("/", subscribe);
router.post("/unsubscribe", unsubscribe);
router.get("/mine", requireAuth, requireRole("JOB_SEEKER"), getMyAlert);
router.post("/mine", requireAuth, requireRole("JOB_SEEKER"), saveMyAlert);
router.delete("/mine", requireAuth, requireRole("JOB_SEEKER"), deleteMyAlert);
var jobAlert_routes_default = router;
export {
  jobAlert_routes_default as default
};
