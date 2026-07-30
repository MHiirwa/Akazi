import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { createReview, listEmployerReviews, deleteReview } from "../controllers/review.controller.js";
const router = Router();
router.get("/employers/:id/reviews", listEmployerReviews);
router.post("/employers/:id/reviews", requireAuth, requireRole("JOB_SEEKER"), createReview);
router.delete("/reviews/:id", requireAuth, deleteReview);
var review_routes_default = router;
export {
  review_routes_default as default
};
