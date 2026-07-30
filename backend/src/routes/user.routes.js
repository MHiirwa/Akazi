import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { userStats } from "../controllers/stats.controller.js";
import { searchTalent, getTalentProfile } from "../controllers/talent.controller.js";
const router = Router();
router.get("/stats", requireAuth, requireRole("ADMIN"), userStats);
router.get("/talent", requireAuth, requireRole("EMPLOYER"), searchTalent);
router.get("/talent/:id", getTalentProfile);
var user_routes_default = router;
export {
  user_routes_default as default
};
