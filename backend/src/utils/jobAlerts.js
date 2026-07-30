import prisma from "../config/prisma.js";
import { sendNotification } from "./notifications.js";
import { jobAlertEmail, appUrl } from "./emailTemplates.js";
function jobMatchesAlert(job, alert) {
  if (alert.keyword && !job.title.toLowerCase().includes(alert.keyword.toLowerCase())) return false;
  if (alert.location && !job.location.toLowerCase().includes(alert.location.toLowerCase())) return false;
  if (alert.jobType && alert.jobType !== job.jobType) return false;
  return true;
}
async function notifyJobAlertsForJob(job) {
  try {
    const alerts = await prisma.jobAlert.findMany({
      where: {
        active: true,
        OR: [{ jobType: null }, { jobType: job.jobType }]
      }
    });
    const matches = alerts.filter((a) => jobMatchesAlert(job, a));
    const jobUrl = `${appUrl()}/jobs/${job.id}`;
    await Promise.allSettled(
      matches.map(
        (alert) => sendNotification({
          to: alert.email,
          ...jobAlertEmail({
            jobTitle: job.title,
            jobLocation: job.location,
            jobType: job.jobType,
            jobUrl,
            unsubscribeUrl: `${appUrl()}/unsubscribe?token=${alert.unsubToken}`
          })
        })
      )
    );
  } catch (err) {
    console.error("[jobAlerts] dispatch failed:", err.message);
  }
}
export {
  notifyJobAlertsForJob
};
