import prisma from "../config/prisma.js";
import { VISIBLE_EMPLOYER } from "../constants/jobVisibility.js";
import { getCache, setCache } from "../config/cache.js";
const FIVE_MINUTES = 300;
async function jobStats(req, res, next) {
  try {
    const cached = getCache("stats:jobs");
    if (cached) return res.json({ ...cached, cached: true });
    const where = { status: "PUBLISHED", employer: VISIBLE_EMPLOYER };
    const [totalJobs, agg, byLocation, byIndustry, byJobType] = await Promise.all([
      prisma.job.count({ where }),
      prisma.job.aggregate({ where, _avg: { salaryMin: true } }),
      prisma.job.groupBy({ by: ["location"], where, _count: { location: true }, orderBy: { _count: { location: "desc" } } }),
      prisma.job.groupBy({ by: ["industry"], where, _count: { industry: true } }),
      prisma.job.groupBy({ by: ["jobType"], where, _count: { jobType: true } })
    ]);
    const payload = {
      totalJobs,
      averageSalary: agg._avg.salaryMin != null ? Math.round(agg._avg.salaryMin) : null,
      byLocation,
      byIndustry,
      byJobType
    };
    setCache("stats:jobs", payload, FIVE_MINUTES);
    res.json(payload);
  } catch (err) {
    next(err);
  }
}
async function userStats(req, res, next) {
  try {
    const cached = getCache("stats:users");
    if (cached) return res.json({ ...cached, cached: true });
    const [totalUsers, byRole, pendingEmployers, suspended] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({ by: ["role"], _count: { role: true } }),
      prisma.user.count({ where: { role: "EMPLOYER", employerStatus: "PENDING" } }),
      prisma.user.count({ where: { isSuspended: true } })
    ]);
    const payload = { totalUsers, byRole, pendingEmployers, suspended };
    setCache("stats:users", payload, FIVE_MINUTES);
    res.json(payload);
  } catch (err) {
    next(err);
  }
}
export {
  jobStats,
  userStats
};
