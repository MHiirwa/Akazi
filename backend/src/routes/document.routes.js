import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { documentUpload } from "../config/multer.js";
import { uploadDocument, listDocuments, deleteDocument } from "../controllers/document.controller.js";

const router = Router();
router.get("/", requireAuth, requireRole("JOB_SEEKER"), listDocuments);
router.post("/", requireAuth, requireRole("JOB_SEEKER"), documentUpload.single("document"), uploadDocument);
router.delete("/:id", requireAuth, requireRole("JOB_SEEKER"), deleteDocument);

export default router;
