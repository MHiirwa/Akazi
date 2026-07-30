import prisma from "../config/prisma.js";

// List the current user's notifications, newest first, plus an unread count.
async function listNotifications(req, res, next) {
  try {
    const [notifications, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.notification.count({ where: { userId: req.user.id, read: false } }),
    ]);
    res.json({ notifications, unread });
  } catch (err) {
    next(err);
  }
}

// Mark a single notification read (only the owner's).
async function markRead(req, res, next) {
  try {
    const result = await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { read: true },
    });
    if (result.count === 0) return res.status(404).json({ error: "Notification not found" });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// Mark every notification for the current user read.
async function markAllRead(req, res, next) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export { listNotifications, markRead, markAllRead };
