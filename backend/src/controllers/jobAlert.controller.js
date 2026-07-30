import crypto from "node:crypto";
import { z } from "zod";
import prisma from "../config/prisma.js";
import { JOB_TYPE_VALUES } from "../constants/jobTypes.js";
const optionalText = z.string().trim().max(120).optional().transform((v) => v ? v : void 0);
const subscribeSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.string().email("Enter a valid email address")),
  keyword: optionalText,
  location: optionalText,
  jobType: z.enum(JOB_TYPE_VALUES).optional().or(z.literal("").transform(() => void 0))
});
async function subscribe(req, res, next) {
  try {
    const data = subscribeSchema.parse(req.body);
    const alert = await prisma.jobAlert.upsert({
      where: { email: data.email },
      update: {
        keyword: data.keyword ?? null,
        location: data.location ?? null,
        jobType: data.jobType ?? null,
        active: true
      },
      create: {
        email: data.email,
        keyword: data.keyword ?? null,
        location: data.location ?? null,
        jobType: data.jobType ?? null,
        unsubToken: crypto.randomBytes(24).toString("hex")
      }
    });
    res.status(201).json({
      message: "You're subscribed — we'll email you when a matching job is posted.",
      subscription: { email: alert.email, keyword: alert.keyword, location: alert.location, jobType: alert.jobType }
    });
  } catch (err) {
    next(err);
  }
}
async function unsubscribe(req, res, next) {
  try {
    const token = (req.body?.token || req.query?.token || "").trim();
    if (token) {
      await prisma.jobAlert.updateMany({ where: { unsubToken: token }, data: { active: false } });
    }
    res.json({ message: "You've been unsubscribed from Akazi job alerts." });
  } catch (err) {
    next(err);
  }
}
// --- Account-linked alerts: a signed-in seeker manages one alert tied to their
// account email, straight from their dashboard. ---
const mineSchema = z.object({
  keyword: optionalText,
  location: optionalText,
  jobType: z.enum(JOB_TYPE_VALUES).optional().or(z.literal("").transform(() => void 0))
});

async function getMyAlert(req, res, next) {
  try {
    const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { email: true } });
    const alert = await prisma.jobAlert.findUnique({ where: { email: me.email } });
    res.json({ alert: alert && alert.active ? alert : null });
  } catch (err) {
    next(err);
  }
}

async function saveMyAlert(req, res, next) {
  try {
    const data = mineSchema.parse(req.body);
    const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { email: true } });
    const alert = await prisma.jobAlert.upsert({
      where: { email: me.email },
      update: { keyword: data.keyword ?? null, location: data.location ?? null, jobType: data.jobType ?? null, active: true },
      create: {
        email: me.email,
        keyword: data.keyword ?? null,
        location: data.location ?? null,
        jobType: data.jobType ?? null,
        unsubToken: crypto.randomBytes(24).toString("hex")
      }
    });
    res.json({ alert });
  } catch (err) {
    next(err);
  }
}

async function deleteMyAlert(req, res, next) {
  try {
    const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { email: true } });
    await prisma.jobAlert.updateMany({ where: { email: me.email }, data: { active: false } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export {
  subscribe,
  unsubscribe,
  getMyAlert,
  saveMyAlert,
  deleteMyAlert
};
