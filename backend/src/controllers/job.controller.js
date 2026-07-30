import { z } from "zod";
import prisma from "../config/prisma.js";
import { JOB_TYPE_VALUES } from "../constants/jobTypes.js";
import { VISIBLE_EMPLOYER } from "../constants/jobVisibility.js";
import { notifyJobAlertsForJob } from "../utils/jobAlerts.js";
import { getCache, setCache, clearCache } from "../config/cache.js";
function invalidateJobCaches() {
  clearCache("search:jobs");
  clearCache("stats:jobs");
}
const createJobSchema = z
  .object({
    title: z.string().min(3).max(120),
    description: z.string().min(20).max(5e3),
    location: z.string().min(2).max(120),
    industry: z.string().min(2).max(120),
    jobType: z.enum(JOB_TYPE_VALUES, {
      errorMap: () => ({
        message: `Job type must be one of: ${JOB_TYPE_VALUES.join(", ")}`,
      }),
    }),
    salaryMin: z.number().int().positive().nullable().optional(),
    salaryMax: z.number().int().positive().nullable().optional(),
    remote: z.boolean().optional(),
    openings: z.number().int().positive().max(10000).optional(),
    deadline: z.coerce.date().optional().nullable(),
    requiredSkills: z.array(z.string().min(1).max(60)).max(30).optional(),
  })
  .refine(
    (d) =>
      d.salaryMin == null || d.salaryMax == null || d.salaryMax >= d.salaryMin,
    {
      message: "salaryMax must be greater than or equal to salaryMin",
      path: ["salaryMax"],
    },
  );
async function createJob(req, res, next) {
  try {
    const data = createJobSchema.parse(req.body);
    const employer = await prisma.user.findUnique({
      where: { id: req.user.id },
    });
    if (employer.employerStatus !== "VERIFIED") {
      return res.status(403).json({
        error:
          "Your employer account is still under review. You can't post jobs yet.",
      });
    }
    const job = await prisma.job.create({
      data: { ...data, employerId: req.user.id },
    });
    invalidateJobCaches();
    notifyJobAlertsForJob(job);
    res.status(201).json({ job });
  } catch (err) {
    next(err);
  }
}
async function searchJobs(req, res, next) {
  try {
    const {
      location,
      industry,
      jobType,
      q,
      minSalary,
      maxSalary,
      page = "1",
      limit = "20",
    } = req.query;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const cacheKey = `search:jobs:${JSON.stringify({ location, industry, jobType, q, minSalary, maxSalary, pageNum, pageSize })}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json({ ...cached, cached: true });
    const salaryFilters = [];
    const floor = parseInt(minSalary, 10);
    const ceiling = parseInt(maxSalary, 10);
    if (Number.isFinite(floor)) {
      salaryFilters.push({
        OR: [{ salaryMax: { gte: floor } }, { salaryMax: null }],
      });
    }
    if (Number.isFinite(ceiling)) {
      salaryFilters.push({
        OR: [{ salaryMin: { lte: ceiling } }, { salaryMin: null }],
      });
    }
    const where = {
      status: "PUBLISHED",
      employer: VISIBLE_EMPLOYER,
      ...(location && {
        location: { contains: location, mode: "insensitive" },
      }),
      ...(industry && {
        industry: { contains: industry, mode: "insensitive" },
      }),
      ...(jobType && { jobType: { contains: jobType, mode: "insensitive" } }),
      ...(q && { title: { contains: q, mode: "insensitive" } }),
      ...(salaryFilters.length && { AND: salaryFilters }),
    };
    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
        include: { employer: { select: { id: true, fullName: true } } },
      }),
      prisma.job.count({ where }),
    ]);
    const payload = {
      jobs,
      total,
      page: pageNum,
      pageSize,
      data: jobs,
      meta: {
        total,
        page: pageNum,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
    setCache(cacheKey, payload, 60);
    res.json(payload);
  } catch (err) {
    next(err);
  }
}
async function getJob(req, res, next) {
  try {
    const job = await prisma.job.findFirst({
      where: {
        id: req.params.id,
        status: "PUBLISHED",
        employer: VISIBLE_EMPLOYER,
      },
      include: { employer: { select: { id: true, fullName: true } } },
    });
    if (!job) {
      return res
        .status(404)
        .json({ error: "This job listing isn't available" });
    }
    res.json({ job });
  } catch (err) {
    next(err);
  }
}
const updateJobSchema = z
  .object({
    title: z.string().min(3).max(120).optional(),
    description: z.string().min(20).max(5e3).optional(),
    location: z.string().min(2).max(120).optional(),
    industry: z.string().min(2).max(120).optional(),
    jobType: z.enum(JOB_TYPE_VALUES).optional(),
    salaryMin: z.number().int().positive().nullable().optional(),
    salaryMax: z.number().int().positive().nullable().optional(),
    status: z.enum(["PUBLISHED", "DRAFT"]).optional(),
    remote: z.boolean().optional(),
    openings: z.number().int().positive().max(10000).nullable().optional(),
    deadline: z.coerce.date().nullable().optional(),
    requiredSkills: z.array(z.string().min(1).max(60)).max(30).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "Provide at least one field to update",
  })
  .refine(
    (d) =>
      d.salaryMin == null || d.salaryMax == null || d.salaryMax >= d.salaryMin,
    {
      message: "salaryMax must be greater than or equal to salaryMin",
      path: ["salaryMax"],
    },
  );
async function updateJob(req, res, next) {
  try {
    const data = updateJobSchema.parse(req.body);
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.employerId !== req.user.id) {
      return res
        .status(403)
        .json({ error: "You can only edit your own listings" });
    }
    if (job.status === "REMOVED") {
      return res.status(403).json({
        error: "This listing was removed by an admin and can't be edited.",
      });
    }
    const updated = await prisma.job.update({ where: { id: job.id }, data });
    invalidateJobCaches();
    res.json({ job: updated });
  } catch (err) {
    next(err);
  }
}
async function deleteJob(req, res, next) {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.employerId !== req.user.id) {
      return res
        .status(403)
        .json({ error: "You can only delete your own listings" });
    }
    // Remove the job's applications first so the delete isn't blocked by the
    // foreign key (a listing with applicants would otherwise fail to delete).
    await prisma.$transaction([
      prisma.application.deleteMany({ where: { jobId: job.id } }),
      prisma.job.delete({ where: { id: job.id } }),
    ]);
    invalidateJobCaches();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
async function myJobs(req, res, next) {
  try {
    const jobs = await prisma.job.findMany({
      where: { employerId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ jobs });
  } catch (err) {
    next(err);
  }
}
async function jobApplicantCounts(req, res, next) {
  try {
    const counts = await prisma.application.groupBy({
      by: ["jobId"],
      where: { job: { employerId: req.user.id } },
      _count: { _all: true },
    });
    res.json({ counts });
  } catch (err) {
    next(err);
  }
}

// Employer hiring analytics: applications bucketed into the last 8 weeks (for a
// bar chart) plus a status breakdown across all of this employer's applications.
async function employerAnalytics(req, res, next) {
  try {
    const WEEKS = 8;
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - WEEKS * 7);

    const apps = await prisma.application.findMany({
      where: { job: { employerId: req.user.id } },
      select: { createdAt: true, status: true },
    });

    // Weekly buckets, oldest → newest, labelled by the week's start date.
    const series = Array.from({ length: WEEKS }, (_, i) => {
      const bucketStart = new Date(start);
      bucketStart.setDate(start.getDate() + i * 7);
      return {
        label: bucketStart.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        value: 0,
      };
    });

    const byStatus = {};
    for (const a of apps) {
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
      const created = new Date(a.createdAt);
      if (created >= start) {
        const idx = Math.min(WEEKS - 1, Math.floor((created - start) / (7 * 86_400_000)));
        series[idx].value += 1;
      }
    }

    res.json({ series, byStatus, total: apps.length });
  } catch (err) {
    next(err);
  }
}

export {
  createJob,
  deleteJob,
  employerAnalytics,
  getJob,
  jobApplicantCounts,
  myJobs,
  searchJobs,
  updateJob,
};
