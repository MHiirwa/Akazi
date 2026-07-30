import prisma from "../config/prisma.js";
import {
  isConfigured,
  uploadToCloudinary,
  deleteFromCloudinary
} from "../config/cloudinary.js";
async function uploadAvatar(req, res, next) {
  try {
    if (!isConfigured()) {
      return res.status(503).json({
        error: "Image uploads aren't configured on the server (missing Cloudinary credentials)."
      });
    }
    if (!req.file) {
      return res.status(400).json({
        error: "No image file was uploaded (field name must be 'avatar')."
      });
    }
    const current = await prisma.user.findUnique({
      where: { id: req.user.id }
    });
    if (!current) return res.status(404).json({ error: "User not found" });
    const { url, publicId } = await uploadToCloudinary(
      req.file.buffer,
      "akazi/avatars"
    );
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl: url, avatarPublicId: publicId }
    });
    if (current.avatarPublicId && current.avatarPublicId !== publicId) {
      await deleteFromCloudinary(current.avatarPublicId);
    }
    const { password, ...publicUser } = user;
    res.json({ user: publicUser });
  } catch (err) {
    next(err);
  }
}
async function uploadResume(req, res, next) {
  try {
    if (!isConfigured()) {
      return res.status(503).json({
        error: "Resume uploads aren't configured on the server (missing Cloudinary credentials)."
      });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file was uploaded (field name must be 'resume')." });
    }
    const current = await prisma.user.findUnique({
      where: { id: req.user.id }
    });
    if (!current) return res.status(404).json({ error: "User not found" });
    const { url, publicId } = await uploadToCloudinary(
      req.file.buffer,
      "akazi/resumes",
      "raw"
    );
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { resumeUrl: url, resumePublicId: publicId }
    });
    if (current.resumePublicId && current.resumePublicId !== publicId) {
      await deleteFromCloudinary(current.resumePublicId, "raw");
    }
    const { password, ...publicUser } = user;
    res.json({ user: publicUser });
  } catch (err) {
    next(err);
  }
}
export {
  uploadAvatar,
  uploadResume
};
