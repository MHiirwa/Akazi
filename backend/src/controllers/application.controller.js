import prisma from "../config/prisma.js";
import { sendNotification } from "../utils/notifications.js";
import { createNotification } from "../utils/notify.js";
import { applicationStatusEmail } from "../utils/emailTemplates.js";
const parsedLimit = parseInt(process.env.MAX_APPLICATIONS_PER_DAY, 10);
const DAILY_APPLICATION_LIMIT = Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20;
async function applyToJob(req, res, next) {
  try {
    const { jobId, coverLetter } = req.body;
    if (!jobId) return res.status(400).json({ error: "jobId is required" });
    if (coverLetter != null && typeof coverLetter !== "string") {
      return res.status(400).json({ error: "coverLetter must be text" });
    }
    if (typeof coverLetter === "string" && coverLetter.length > 3e3) {
      return res.status(400).json({ error: "coverLetter must be 3000 characters or fewer" });
    }
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job || job.status !== "PUBLISHED") {
      return res.status(404).json({ error: "This job listing isn't available" });
    }
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayCount = await prisma.application.count({
      where: { applicantId: req.user.id, createdAt: { gte: startOfDay } }
    });
    if (todayCount >= DAILY_APPLICATION_LIMIT) {
      return res.status(429).json({
        error: `You've reached today's application limit of ${DAILY_APPLICATION_LIMIT}. Try again tomorrow.`
      });
    }
    const existing = await prisma.application.findUnique({
      where: { jobId_applicantId: { jobId, applicantId: req.user.id } }
    });
    if (existing) {
      return res.status(409).json({ error: "You've already applied to this job" });
    }
    const application = await prisma.application.create({
      data: {
        jobId,
        applicantId: req.user.id,
        coverLetter: typeof coverLetter === "string" && coverLetter.trim() ? coverLetter.trim() : null
      }
    });
    createNotification({
      userId: job.employerId,
      type: "APPLICATION_RECEIVED",
      message: `New application received for "${job.title}".`,
      link: "/dashboard"
    });
    res.status(201).json({ application });
  } catch (err) {
    next(err);
  }
}
async function withdrawApplication(req, res, next) {
  try {
    const application = await prisma.application.findUnique({ where: { id: req.params.id } });
    if (!application) return res.status(404).json({ error: "Application not found" });
    if (application.applicantId !== req.user.id) {
      return res.status(403).json({ error: "You can only withdraw your own applications" });
    }
    const updated = await prisma.application.update({
      where: { id: application.id },
      data: { status: "WITHDRAWN" }
    });
    res.json({ application: updated });
  } catch (err) {
    next(err);
  }
}
async function viewJobApplications(req, res, next) {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.jobId } });
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.employerId !== req.user.id) {
      return res.status(403).json({ error: "You can only view applicants for your own listings" });
    }
    const applications = await prisma.application.findMany({
      where: { jobId: job.id },
      include: {
        applicant: {
          select: { id: true, fullName: true, email: true, phone: true, skills: true, resumeUrl: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json({ applications });
  } catch (err) {
    next(err);
  }
}
// Every application across all of the employer's listings, with the full
// candidate background, for the dedicated Applicants section.
async function employerApplications(req, res, next) {
  try {
    const applications = await prisma.application.findMany({
      where: { job: { employerId: req.user.id } },
      include: {
        applicant: {
          select: {
            id: true, fullName: true, email: true, phone: true, skills: true,
            resumeUrl: true, avatarUrl: true, headline: true, bio: true, location: true,
            availableForFreelance: true, experiences: true, projects: true,
          },
        },
        job: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ applications });
  } catch (err) {
    next(err);
  }
}

async function myApplications(req, res, next) {
  try {
    const applications = await prisma.application.findMany({
      where: { applicantId: req.user.id },
      include: { job: true },
      orderBy: { createdAt: "desc" }
    });
    res.json({ applications });
  } catch (err) {
    next(err);
  }
}
async function updateApplicationStatus(req, res, next) {
  try {
    const { status } = req.body;
    const reason = typeof req.body.reason === "string" ? req.body.reason.trim() : "";
    const allowed = ["REVIEWED", "REJECTED", "ACCEPTED"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` });
    }
    // A rejection must come with a reason so the candidate gets useful feedback.
    if (status === "REJECTED" && !reason) {
      return res.status(400).json({ error: "A reason is required to reject an applicant." });
    }
    if (reason.length > 1000) {
      return res.status(400).json({ error: "Reason must be 1000 characters or fewer." });
    }
    const application = await prisma.application.findUnique({
      where: { id: req.params.id },
      include: { job: true, applicant: true }
    });
    if (!application) return res.status(404).json({ error: "Application not found" });
    if (application.job.employerId !== req.user.id) {
      return res.status(403).json({ error: "You can only manage applicants for your own listings" });
    }
    const updated = await prisma.application.update({
      where: { id: application.id },
      // Keep the reason on the application so the seeker can see it; clear it if
      // the employer later moves the applicant to a non-rejected status.
      data: status === "REJECTED" ? { status, rejectionReason: reason } : { status, rejectionReason: null }
    });
    await sendNotification({
      to: application.applicant.email,
      ...applicationStatusEmail({
        fullName: application.applicant.fullName,
        jobTitle: application.job.title,
        status,
        reason: status === "REJECTED" ? reason : ""
      })
    });
    createNotification({
      userId: application.applicantId,
      type: "APPLICATION_STATUS",
      message: status === "REJECTED" && reason
        ? `Your application for "${application.job.title}" was not successful. Reason: ${reason}`
        : `Your application for "${application.job.title}" is now ${status}.`,
      link: "/dashboard"
    });
    res.json({ application: updated });
  } catch (err) {
    next(err);
  }
}

// Employer schedules (or clears) an interview for an applicant. The candidate is
// notified so they see the next step on their application.
async function scheduleInterview(req, res, next) {
  try {
    const { interviewAt, location, note } = req.body;
    const application = await prisma.application.findUnique({
      where: { id: req.params.id },
      include: { job: true, applicant: true }
    });
    if (!application) return res.status(404).json({ error: "Application not found" });
    if (application.job.employerId !== req.user.id) {
      return res.status(403).json({ error: "You can only manage applicants for your own listings" });
    }
    // An empty interviewAt clears the interview.
    const when = interviewAt ? new Date(interviewAt) : null;
    if (interviewAt && Number.isNaN(when.getTime())) {
      return res.status(400).json({ error: "interviewAt must be a valid date/time" });
    }
    const updated = await prisma.application.update({
      where: { id: application.id },
      data: {
        interviewAt: when,
        interviewLocation: when && typeof location === "string" ? location.trim() || null : null,
        interviewNote: when && typeof note === "string" ? note.trim() || null : null,
      }
    });
    if (when) {
      createNotification({
        userId: application.applicantId,
        type: "INTERVIEW_SCHEDULED",
        message: `You have an interview for "${application.job.title}" on ${when.toLocaleString()}.`,
        link: "/dashboard?section=applications"
      });
    }
    res.json({ application: updated });
  } catch (err) {
    next(err);
  }
}

// Employer triage: shortlist an applicant and/or attach a private note. Only the
// employer who owns the job may do this.
async function reviewApplication(req, res, next) {
  try {
    const { shortlisted, note } = req.body;
    if (shortlisted === undefined && note === undefined) {
      return res.status(400).json({ error: "Provide shortlisted and/or note to update" });
    }
    if (note != null && typeof note !== "string") {
      return res.status(400).json({ error: "note must be text" });
    }
    if (typeof note === "string" && note.length > 2000) {
      return res.status(400).json({ error: "note must be 2000 characters or fewer" });
    }
    const application = await prisma.application.findUnique({
      where: { id: req.params.id },
      include: { job: true }
    });
    if (!application) return res.status(404).json({ error: "Application not found" });
    if (application.job.employerId !== req.user.id) {
      return res.status(403).json({ error: "You can only manage applicants for your own listings" });
    }
    const data = {};
    if (shortlisted !== undefined) data.shortlisted = Boolean(shortlisted);
    if (note !== undefined) data.employerNote = typeof note === "string" && note.trim() ? note.trim() : null;
    const updated = await prisma.application.update({ where: { id: application.id }, data });
    res.json({ application: updated });
  } catch (err) {
    next(err);
  }
}
export {
  applyToJob,
  employerApplications,
  myApplications,
  reviewApplication,
  scheduleInterview,
  updateApplicationStatus,
  viewJobApplications,
  withdrawApplication
};
