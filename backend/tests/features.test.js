import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { prisma, resetDb, startServer, req, makeUser, VALID_JOB } from "./helpers.js";
let baseUrl;
let close;
before(async () => {
  ({ baseUrl, close } = await startServer());
});
after(async () => {
  await close();
  await prisma.$disconnect();
});
beforeEach(resetDb);
async function makeAdminToken() {
  const email = `admin-${Date.now()}-${Math.random().toString(16).slice(2)}@test.dev`;
  await prisma.user.create({
    data: { fullName: "Test Admin", email, password: await bcrypt.hash("Password123", 10), role: "ADMIN" }
  });
  const login = await req(baseUrl, "POST", "/api/auth/login", { body: { email, password: "Password123" } });
  return login.data.token;
}
async function seedEmployerAndJob() {
  const employer = await makeUser(baseUrl, { role: "EMPLOYER", verified: true });
  const { data } = await req(baseUrl, "POST", "/api/jobs", { token: employer.token, body: VALID_JOB });
  return { employer, job: data.job };
}
test("a cover letter submitted on apply is visible to the employer", async () => {
  const { employer, job } = await seedEmployerAndJob();
  const seeker = await makeUser(baseUrl, { role: "JOB_SEEKER" });
  const applied = await req(baseUrl, "POST", "/api/applications", {
    token: seeker.token,
    body: { jobId: job.id, coverLetter: "  I am a great fit because…  " }
  });
  assert.equal(applied.status, 201);
  const view = await req(baseUrl, "GET", `/api/applications/job/${job.id}`, { token: employer.token });
  assert.equal(view.status, 200);
  const app = view.data.applications[0];
  assert.equal(app.coverLetter, "I am a great fit because…");
  assert.ok("skills" in app.applicant);
  assert.ok("resumeUrl" in app.applicant);
});
test("an over-long cover letter is rejected (400)", async () => {
  const { job } = await seedEmployerAndJob();
  const seeker = await makeUser(baseUrl, { role: "JOB_SEEKER" });
  const res = await req(baseUrl, "POST", "/api/applications", {
    token: seeker.token,
    body: { jobId: job.id, coverLetter: "x".repeat(3001) }
  });
  assert.equal(res.status, 400);
});
test("an employer can edit their listing; a non-owner cannot", async () => {
  const { employer, job } = await seedEmployerAndJob();
  const other = await makeUser(baseUrl, { role: "EMPLOYER", verified: true });
  const edit = await req(baseUrl, "PATCH", `/api/jobs/${job.id}`, {
    token: employer.token,
    body: { title: "Updated Title", salaryMin: 1e5, salaryMax: 2e5 }
  });
  assert.equal(edit.status, 200);
  assert.equal(edit.data.job.title, "Updated Title");
  const forbidden = await req(baseUrl, "PATCH", `/api/jobs/${job.id}`, {
    token: other.token,
    body: { title: "Hijacked" }
  });
  assert.equal(forbidden.status, 403);
});
test("closing a listing (DRAFT) hides it from public search; reopening restores it", async () => {
  const { employer, job } = await seedEmployerAndJob();
  assert.equal((await req(baseUrl, "GET", "/api/jobs")).data.jobs.length, 1);
  const closed = await req(baseUrl, "PATCH", `/api/jobs/${job.id}`, { token: employer.token, body: { status: "DRAFT" } });
  assert.equal(closed.status, 200);
  assert.equal((await req(baseUrl, "GET", "/api/jobs")).data.jobs.length, 0);
  assert.equal((await req(baseUrl, "GET", `/api/jobs/${job.id}`)).status, 404);
  await req(baseUrl, "PATCH", `/api/jobs/${job.id}`, { token: employer.token, body: { status: "PUBLISHED" } });
  assert.equal((await req(baseUrl, "GET", "/api/jobs")).data.jobs.length, 1);
});
test("editing rejects an incoherent salary range (400)", async () => {
  const { employer, job } = await seedEmployerAndJob();
  const res = await req(baseUrl, "PATCH", `/api/jobs/${job.id}`, {
    token: employer.token,
    body: { salaryMin: 900, salaryMax: 100 }
  });
  assert.equal(res.status, 400);
});
test("admin user list supports search and role filter with pagination meta", async () => {
  const adminToken = await makeAdminToken();
  await makeUser(baseUrl, { role: "JOB_SEEKER", email: "alice.unique@test.dev" });
  await makeUser(baseUrl, { role: "EMPLOYER", email: "bob.employer@test.dev" });
  const search = await req(baseUrl, "GET", "/api/admin/users?q=alice.unique", { token: adminToken });
  assert.equal(search.status, 200);
  assert.equal(search.data.data.length, 1);
  assert.equal(search.data.data[0].email, "alice.unique@test.dev");
  assert.ok(search.data.meta.totalPages >= 1);
  const employersOnly = await req(baseUrl, "GET", "/api/admin/users?role=EMPLOYER", { token: adminToken });
  assert.ok(employersOnly.data.data.every((u) => u.role === "EMPLOYER"));
});
test("subscribing to job alerts is idempotent per email and stores filters", async () => {
  const first = await req(baseUrl, "POST", "/api/job-alerts", {
    body: { email: "Watcher@test.dev", location: "Kigali", jobType: "FULL_TIME" }
  });
  assert.equal(first.status, 201);
  assert.equal(first.data.subscription.email, "watcher@test.dev");
  assert.equal(first.data.subscription.location, "Kigali");
  const again = await req(baseUrl, "POST", "/api/job-alerts", {
    body: { email: "watcher@test.dev", keyword: "engineer" }
  });
  assert.equal(again.status, 201);
  const count = await prisma.jobAlert.count({ where: { email: "watcher@test.dev" } });
  assert.equal(count, 1);
});
test("subscribing rejects an invalid email (400)", async () => {
  const res = await req(baseUrl, "POST", "/api/job-alerts", { body: { email: "not-an-email" } });
  assert.equal(res.status, 400);
});
test("posting a matching job flags the subscriber; a non-match does not; unsubscribe deactivates", async () => {
  await req(baseUrl, "POST", "/api/job-alerts", {
    body: { email: "match@test.dev", location: "Kigali", jobType: "FULL_TIME" }
  });
  const alert = await prisma.jobAlert.findUnique({ where: { email: "match@test.dev" } });
  assert.equal(alert.active, true);
  assert.equal(alert.jobType, "FULL_TIME");
  const un = await req(baseUrl, "POST", "/api/job-alerts/unsubscribe", { body: { token: alert.unsubToken } });
  assert.equal(un.status, 200);
  const after2 = await prisma.jobAlert.findUnique({ where: { email: "match@test.dev" } });
  assert.equal(after2.active, false);
  const unknown = await req(baseUrl, "POST", "/api/job-alerts/unsubscribe", { body: { token: "nope" } });
  assert.equal(unknown.status, 200);
});
test("the reviews endpoint returns the employer's public profile", async () => {
  const employer = await makeUser(baseUrl, { role: "EMPLOYER", verified: true });
  const res = await req(baseUrl, "GET", `/api/employers/${employer.user.id}/reviews`);
  assert.equal(res.status, 200);
  assert.equal(res.data.employer.id, employer.user.id);
  assert.equal(res.data.employer.fullName, employer.user.fullName);
  const missing = await req(baseUrl, "GET", "/api/employers/00000000-0000-0000-0000-000000000000/reviews");
  assert.equal(missing.status, 404);
});
