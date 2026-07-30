import prisma from "../config/prisma.js";
import { isConfigured, uploadToCloudinary, deleteFromCloudinary } from "../config/cloudinary.js";

// Upload an extra document (certificate, portfolio file, etc.). These are
// separate from the single primary resume.
async function uploadDocument(req, res, next) {
  try {
    if (!isConfigured()) {
      return res.status(503).json({ error: "File uploads aren't configured on the server (missing Cloudinary credentials)." });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file was uploaded (field name must be 'document')." });
    }
    const name = (req.body?.name || req.file.originalname || "Document").toString().trim().slice(0, 120);
    const { url, publicId } = await uploadToCloudinary(req.file.buffer, "akazi/documents", "raw");
    const doc = await prisma.seekerDocument.create({
      data: { userId: req.user.id, name, url, publicId },
    });
    res.status(201).json({ document: doc });
  } catch (err) {
    next(err);
  }
}

async function listDocuments(req, res, next) {
  try {
    const documents = await prisma.seekerDocument.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ documents });
  } catch (err) {
    next(err);
  }
}

async function deleteDocument(req, res, next) {
  try {
    const doc = await prisma.seekerDocument.findUnique({ where: { id: req.params.id } });
    if (!doc || doc.userId !== req.user.id) {
      return res.status(404).json({ error: "Document not found" });
    }
    await prisma.seekerDocument.delete({ where: { id: doc.id } });
    if (doc.publicId) await deleteFromCloudinary(doc.publicId, "raw");
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export { uploadDocument, listDocuments, deleteDocument };
