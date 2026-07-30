// Canonical role display strings, shared by every place that shows a user's
// role. Values match the Prisma Role enum on the backend.
export const ROLE_LABELS = {
  JOB_SEEKER: "Job Seeker",
  EMPLOYER: "Employer",
  ADMIN: "Admin",
};

// Short one-line description of what each role's dashboard is for.
export const ROLE_SUBTITLES = {
  JOB_SEEKER: "Track your applications and find your next role.",
  EMPLOYER: "Post listings and review the people applying to them.",
  ADMIN: "Manage users and moderate job listings across Akazi.",
};

export function roleLabel(role) {
  return ROLE_LABELS[role] || role;
}

// Where a user lands right after authenticating. Job seekers go straight to
// the Browse Jobs page; employers and admins go to their role dashboard.
export function landingPathForRole(role) {
  return role === "JOB_SEEKER" ? "/jobs" : "/dashboard";
}
