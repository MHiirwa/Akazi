// Application statuses (mirror the Prisma ApplicationStatus enum) plus the
// pill "tone" each one should use. Shared by the employer review UI and the
// job-seeker history so the set and its colors stay consistent.
export const APPLICATION_STATUS_TONE = {
  SUBMITTED: "muted",
  REVIEWED: "warn",
  ACCEPTED: "ok",
  REJECTED: "bad",
  WITHDRAWN: "muted",
};

// The statuses an employer can set on an applicant (SUBMITTED is the initial
// state and WITHDRAWN is seeker-driven, so neither is employer-selectable).
export const EMPLOYER_SETTABLE_STATUSES = ["REVIEWED", "ACCEPTED", "REJECTED"];

// Every status, in display order (used to render the employer's dropdown).
export const APPLICATION_STATUSES = ["SUBMITTED", "REVIEWED", "ACCEPTED", "REJECTED", "WITHDRAWN"];

export function statusTone(status) {
  return APPLICATION_STATUS_TONE[status] || "muted";
}
