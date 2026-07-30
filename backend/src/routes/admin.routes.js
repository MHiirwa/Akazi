import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  listUsers,
  listJobs,
  setUserSuspended,
  setEmployerStatus,
  removeJobListing,
  restoreJobListing
} from "../controllers/admin.controller.js";
const router = Router();
router.use(requireAuth, requireRole("ADMIN"));
router.get("/users", listUsers);
router.patch("/users/:id/suspend", setUserSuspended);
router.patch("/users/:id/employer-status", setEmployerStatus);
router.get("/jobs", listJobs);
router.patch("/jobs/:id/remove", removeJobListing);
router.patch("/jobs/:id/restore", restoreJobListing);
var admin_routes_default = router;
export {
  admin_routes_default as default
};
