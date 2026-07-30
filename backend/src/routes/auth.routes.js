import { Router } from "express";
import {
  register,
  login,
  googleAuth,
  getMe,
  updateMe,
  getProfileCompletion,
  forgotPassword,
  resetPassword
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";
import upload, { resumeUpload } from "../config/multer.js";
import { uploadAvatar, uploadResume } from "../controllers/upload.controller.js";
const router = Router();
router.post("/register", register);
router.post("/login", login);
router.post("/google", googleAuth);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", requireAuth, getMe);
router.patch("/me", requireAuth, updateMe);
router.get("/me/completion", requireAuth, getProfileCompletion);
router.post("/me/avatar", requireAuth, upload.single("avatar"), uploadAvatar);
router.post("/me/resume", requireAuth, resumeUpload.single("resume"), uploadResume);
var auth_routes_default = router;
export {
  auth_routes_default as default
};
