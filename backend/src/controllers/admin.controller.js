import { z } from "zod";
import prisma from "../config/prisma.js";
import { clearCache } from "../config/cache.js";
const suspendSchema = z.object({ suspended: z.boolean() });
const employerStatusSchema = z.object({
  status: z.enum(["PENDING", "VERIFIED", "REJECTED"])
});
function invalidateUserAndJobCaches() {
  clearCache("stats:users");
  clearCache("search:jobs");
  clearCache("stats:jobs");
}
const ROLES = ["JOB_SEEKER", "EMPLOYER", "ADMIN"];
const JOB_STATUSES = ["DRAFT", "PUBLISHED", "REMOVED"];
async function listUsers(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;
    const { q, role, status } = req.query;
    const where = {
      ...q && {
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } }
        ]
      },
      ...role && ROLES.includes(role) && { role },
      ...status === "suspended" && { isSuspended: true },
      ...status === "active" && { isSuspended: false }
    };
    // Full profile fields so the admin can review an employer's details before
    // approving them — shown in the expandable detail panel. Sensitive fields
    // (password, reset tokens) are never selected.
    const select = {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isSuspended: true,
      employerStatus: true,
      createdAt: true,
      phone: true,
      headline: true,
      bio: true,
      location: true,
      website: true,
      avatarUrl: true,
      _count: { select: { jobsPosted: true } }
    };
    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, select, orderBy: { createdAt: "desc" }, skip, take: limit }),
      prisma.user.count({ where })
    ]);
    res.json({
      users,
      data: users,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    next(err);
  }
}
async function setUserSuspended(req, res, next) {
  try {
    const { suspended } = suspendSchema.parse(req.body);
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: "You cannot suspend your own account" });
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isSuspended: suspended }
    });
    invalidateUserAndJobCaches();
    res.json({ user: { id: user.id, isSuspended: user.isSuspended } });
  } catch (err) {
    next(err);
  }
}
async function setEmployerStatus(req, res, next) {
  try {
    const { status } = employerStatusSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { employerStatus: status }
    });
    invalidateUserAndJobCaches();
    res.json({ user: { id: user.id, employerStatus: user.employerStatus } });
  } catch (err) {
    next(err);
  }
}
async function listJobs(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;
    const { q, status } = req.query;
    const where = {
      ...q && { title: { contains: q, mode: "insensitive" } },
      ...status && JOB_STATUSES.includes(status) && { status }
    };
    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          employer: { select: { id: true, fullName: true, email: true, employerStatus: true } },
          _count: { select: { applications: true } }
        }
      }),
      prisma.job.count({ where })
    ]);
    res.json({
      jobs,
      data: jobs,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    next(err);
  }
}
async function removeJobListing(req, res, next) {
  try {
    const job = await prisma.job.update({
      where: { id: req.params.id },
      data: { status: "REMOVED" }
    });
    clearCache("search:jobs");
    clearCache("stats:jobs");
    res.json({ job });
  } catch (err) {
    next(err);
  }
}
async function restoreJobListing(req, res, next) {
  try {
    const job = await prisma.job.update({
      where: { id: req.params.id },
      data: { status: "PUBLISHED" }
    });
    clearCache("search:jobs");
    clearCache("stats:jobs");
    res.json({ job });
  } catch (err) {
    next(err);
  }
}
export {
  listUsers,
  listJobs,
  removeJobListing,
  restoreJobListing,
  setEmployerStatus,
  setUserSuspended
};
