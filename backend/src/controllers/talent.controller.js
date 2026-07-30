import prisma from "../config/prisma.js";

// Public-facing fields an employer may see when browsing the talent pool.
const TALENT_SELECT = {
  id: true,
  fullName: true,
  avatarUrl: true,
  headline: true,
  bio: true,
  location: true,
  skills: true,
  availableForFreelance: true,
  experiences: true,
  projects: true,
  createdAt: true,
};

// Employer talent search: browse JOB_SEEKER profiles, optionally filtered by a
// keyword (name / headline / skill), a specific skill, or freelance availability.
async function searchTalent(req, res, next) {
  try {
    const { q, skill, freelance, page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));

    const and = [{ role: "JOB_SEEKER", isSuspended: false }];
    if (freelance === "true") and.push({ availableForFreelance: true });
    if (skill) and.push({ skills: { has: skill } });
    if (q) {
      and.push({
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { headline: { contains: q, mode: "insensitive" } },
          { skills: { has: q } },
        ],
      });
    }
    const where = { AND: and };

    const [total, candidates] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: TALENT_SELECT,
        orderBy: { updatedAt: "desc" },
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    res.json({
      candidates,
      meta: { total, page: pageNum, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    });
  } catch (err) {
    next(err);
  }
}

// Public, shareable seeker profile (no auth) — used by the seeker's own
// "share my profile" link. Only exposes JOB_SEEKER accounts.
async function getTalentProfile(req, res, next) {
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.params.id, role: "JOB_SEEKER", isSuspended: false },
      select: TALENT_SELECT,
    });
    if (!user) return res.status(404).json({ error: "Profile not found" });
    res.json({ profile: user });
  } catch (err) {
    next(err);
  }
}

export { searchTalent, getTalentProfile };
