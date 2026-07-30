import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { listNotifications, markRead, markAllRead } from "../controllers/notification.controller.js";

const router = Router();
router.get("/", requireAuth, listNotifications);
router.patch("/read-all", requireAuth, markAllRead);
router.patch("/:id/read", requireAuth, markRead);

export default router;
