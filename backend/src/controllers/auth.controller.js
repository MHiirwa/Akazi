import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "../config/prisma.js";
import { signToken } from "../utils/token.js";
import { sendNotification } from "../utils/notifications.js";
import {
  welcomeEmail,
  passwordResetEmail,
  appUrl
} from "../utils/emailTemplates.js";
import { clearCache } from "../config/cache.js";
const emailField = z.string().trim().toLowerCase().pipe(z.string().email("Enter a valid email address"));
const registerSchema = z.object({
  fullName: z.string().min(2, "Full name is too short"),
  email: emailField,
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().min(7, "Enter a valid phone number").max(20).optional(),
  role: z.enum(["JOB_SEEKER", "EMPLOYER"], {
    errorMap: () => ({
      message: "Role must be JOB_SEEKER or EMPLOYER"
    })
  }),
  // A job seeker can opt in to freelance / short-term contract work.
  availableForFreelance: z.boolean().optional()
});
const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password is required")
});
const forgotPasswordSchema = z.object({
  email: emailField
});
const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(8, "Password must be at least 8 characters")
});
const RESET_TOKEN_TTL_MINUTES = 60;
function hashResetToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}
const googleAuthSchema = z.object({
  accessToken: z.string().min(1, "Missing Google access token"),
  role: z.enum(["JOB_SEEKER", "EMPLOYER"]).optional()
});
const experienceItemSchema = z.object({
  title: z.string().trim().min(1, "Experience needs a title").max(120),
  organization: z.string().trim().max(120).optional().default(""),
  period: z.string().trim().max(80).optional().default(""),
  description: z.string().trim().max(1000).optional().default("")
});
const projectItemSchema = z.object({
  name: z.string().trim().min(1, "Project needs a name").max(120),
  description: z.string().trim().max(1000).optional().default(""),
  link: z.string().trim().max(300).optional().default("")
});
const updateProfileSchema = z.object({
  fullName: z.string().min(2, "Full name is too short").optional(),
  phone: z.string().min(7, "Enter a valid phone number").max(20).optional(),
  skills: z.array(z.string().min(1, "Skills can't be empty")).max(50).optional(),
  headline: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(2000).optional(),
  location: z.string().trim().max(120).optional(),
  website: z.string().trim().max(200).optional(),
  availableForFreelance: z.boolean().optional(),
  experiences: z.array(experienceItemSchema).max(30).optional(),
  projects: z.array(projectItemSchema).max(30).optional()
}).refine((data) => Object.keys(data).length > 0, {
  message: "Provide at least one field to update"
});
function toPublicUser(user) {
  const { password, ...publicUser } = user;
  return publicUser;
}
async function register(req, res, next) {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({
      where: { email: data.email }
    });
    if (existing) {
      return res.status(409).json({ error: "An account with that email already exists" });
    }
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        password: passwordHash,
        phone: data.phone,
        role: data.role,
        availableForFreelance: data.role === "JOB_SEEKER" ? Boolean(data.availableForFreelance) : false
      }
    });
    clearCache("stats:users");
    sendNotification({
      to: user.email,
      ...welcomeEmail({ fullName: user.fullName, role: user.role })
    });
    const token = signToken(user);
    res.status(201).json({ token, user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}
async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      return res.status(401).json({ error: "Incorrect email or password" });
    }
    if (!user.password) {
      return res.status(401).json({
        error: "This account uses Google sign-in. Please continue with Google."
      });
    }
    const passwordMatches = await bcrypt.compare(data.password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ error: "Incorrect email or password" });
    }
    if (user.isSuspended) {
      return res.status(403).json({ error: "Your account has been suspended." });
    }
    const token = signToken(user);
    res.json({ token, user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}
async function googleAuth(req, res, next) {
  try {
    const { accessToken, role } = googleAuthSchema.parse(req.body);
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: "Google sign-in is not configured on the server" });
    }
    const tokenInfo = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
    ).then((r) => r.ok ? r.json() : null);
    if (!tokenInfo || tokenInfo.aud !== clientId) {
      return res.status(401).json({ error: "Invalid Google sign-in token" });
    }
    const profile = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    ).then((r) => r.ok ? r.json() : null);
    if (!profile || !profile.email) {
      return res.status(401).json({ error: "Could not read your Google profile" });
    }
    const email = profile.email.toLowerCase();
    let user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: profile.sub,
            avatarUrl: user.avatarUrl || profile.picture || null
          }
        });
      }
    } else {
      user = await prisma.user.create({
        data: {
          fullName: profile.name || email.split("@")[0],
          email,
          role: role || "JOB_SEEKER",
          googleId: profile.sub,
          avatarUrl: profile.picture || null
        }
      });
    }
    if (user.isSuspended) {
      return res.status(403).json({ error: "Your account has been suspended." });
    }
    const token = signToken(user);
    res.json({ token, user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}
async function getMe(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}
async function updateMe(req, res, next) {
  try {
    const data = updateProfileSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data
    });
    res.json({ user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}
const COMPLETION_FIELDS = ["fullName", "email", "phone", "skills"];
function computeCompletion(user) {
  const isComplete = {
    fullName: Boolean(user.fullName && user.fullName.trim()),
    email: Boolean(user.email),
    phone: Boolean(user.phone && user.phone.trim()),
    skills: Array.isArray(user.skills) && user.skills.length > 0
  };
  const missingFields = COMPLETION_FIELDS.filter((f) => !isComplete[f]);
  const completedCount = COMPLETION_FIELDS.length - missingFields.length;
  const percent = Math.round(completedCount / COMPLETION_FIELDS.length * 100);
  return { percent, missingFields };
}
async function getProfileCompletion(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(computeCompletion(user));
  } catch (err) {
    next(err);
  }
}
async function forgotPassword(req, res, next) {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const genericResponse = {
      message: "If an account exists for that email, a reset link is on its way."
    };
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      return res.json(genericResponse);
    }
    const rawToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(
      Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1e3
    );
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetTokenHash: hashResetToken(rawToken),
        resetTokenExpiresAt: expiresAt
      }
    });
    const resetUrl = `${appUrl()}/reset-password?token=${rawToken}`;
    await sendNotification({
      to: user.email,
      ...passwordResetEmail({
        fullName: user.fullName,
        resetUrl,
        expiresMinutes: RESET_TOKEN_TTL_MINUTES
      })
    });
    res.json(genericResponse);
  } catch (err) {
    next(err);
  }
}
async function resetPassword(req, res, next) {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    const user = await prisma.user.findFirst({
      where: {
        resetTokenHash: hashResetToken(token),
        resetTokenExpiresAt: { gt: new Date() }
      }
    });
    if (!user) {
      return res.status(400).json({ error: "This reset link is invalid or has expired." });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: passwordHash,
        resetTokenHash: null,
        resetTokenExpiresAt: null
      }
    });
    res.json({ message: "Your password has been reset. You can now log in." });
  } catch (err) {
    next(err);
  }
}
export {
  forgotPassword,
  getMe,
  getProfileCompletion,
  googleAuth,
  login,
  register,
  resetPassword,
  updateMe
};
