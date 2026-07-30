import prisma from "../config/prisma.js";

// Save a job for later (idempotent — saving twice is a no-op).
async function saveJob(req, res, next) {
  try {
    const { jobId } = req.body;
    if (!jobId) return res.status(400).json({ error: "jobId is required" });
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return res.status(404).json({ error: "Job not found" });
    const saved = await prisma.savedJob.upsert({
      where: { userId_jobId: { userId: req.user.id, jobId } },
      update: {},
      create: { userId: req.user.id, jobId },
    });
    res.status(201).json({ saved });
  } catch (err) {
    next(err);
  }
}

// List the seeker's saved jobs (with the job payload, newest first).
async function listSavedJobs(req, res, next) {
  try {
    const saved = await prisma.savedJob.findMany({
      where: { userId: req.user.id },
      include: { job: { include: { employer: { select: { id: true, fullName: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    // Return the jobs plus the id set so the client can toggle bookmarks.
    res.json({ saved: saved.map((s) => s.job), jobIds: saved.map((s) => s.jobId) });
  } catch (err) {
    next(err);
  }
}

async function unsaveJob(req, res, next) {
  try {
    await prisma.savedJob.deleteMany({ where: { userId: req.user.id, jobId: req.params.jobId } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export { saveJob, listSavedJobs, unsaveJob };
