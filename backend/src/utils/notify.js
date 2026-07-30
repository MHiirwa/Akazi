import prisma from "../config/prisma.js";

// Create an in-app notification for a user. Fire-and-forget: a failure here
// (e.g. the recipient was deleted) must never break the action that triggered
// it, so we swallow errors and just log them.
export async function createNotification({ userId, type, message, link }) {
  try {
    await prisma.notification.create({
      data: { userId, type, message, link: link || null },
    });
  } catch (err) {
    console.error("Failed to create notification:", err.message);
  }
}
