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
async function shortlistedSetup() {
  const employer = await makeUser(baseUrl, { role: "EMPLOYER", verified: true });
  const seeker = await makeUser(baseUrl, { role: "JOB_SEEKER" });
  const { data: jobData } = await req(baseUrl, "POST", "/api/jobs", { token: employer.token, body: VALID_JOB });
  const job = jobData.job;
  const applied = await req(baseUrl, "POST", "/api/applications", { token: seeker.token, body: { jobId: job.id } });
  await req(baseUrl, "PATCH", `/api/applications/${applied.data.application.id}/status`, {
    token: employer.token,
    body: { status: "ACCEPTED" }
  });
  return { employer, seeker, job };
}
async function makeAdminToken() {
  const email = `admin-${Date.now()}@test.dev`;
  await prisma.user.create({
    data: { fullName: "Test Admin", email, password: await bcrypt.hash("Password123", 10), role: "ADMIN" }
  });
  const login = await req(baseUrl, "POST", "/api/auth/login", { body: { email, password: "Password123" } });
  return login.data.token;
}
test("/jobs/stats returns aggregates and is cached on the second call", async () => {
  const employer = await makeUser(baseUrl, { role: "EMPLOYER", verified: true });
  await req(baseUrl, "POST", "/api/jobs", { token: employer.token, body: VALID_JOB });
  const first = await req(baseUrl, "GET", "/api/jobs/stats");
  assert.equal(first.status, 200);
  assert.ok(first.data.totalJobs >= 1);
  assert.ok(Array.isArray(first.data.byJobType));
  assert.notEqual(first.data.cached, true);
  const second = await req(baseUrl, "GET", "/api/jobs/stats");
  assert.equal(second.data.cached, true);
});
test("/users/stats is admin-only and returns counts by role", async () => {
  const seeker = await makeUser(baseUrl, { role: "JOB_SEEKER" });
  const forbidden = await req(baseUrl, "GET", "/api/users/stats", { token: seeker.token });
  assert.equal(forbidden.status, 403);
  const adminToken = await makeAdminToken();
  const ok = await req(baseUrl, "GET", "/api/users/stats", { token: adminToken });
  assert.equal(ok.status, 200);
  assert.ok(ok.data.totalUsers >= 1);
  assert.ok(Array.isArray(ok.data.byRole));
});
test("a seeker who is NOT shortlisted cannot review an employer (403)", async () => {
  const employer = await makeUser(baseUrl, { role: "EMPLOYER", verified: true });
  const seeker = await makeUser(baseUrl, { role: "JOB_SEEKER" });
  const { data: jobData } = await req(baseUrl, "POST", "/api/jobs", { token: employer.token, body: VALID_JOB });
  await req(baseUrl, "POST", "/api/applications", { token: seeker.token, body: { jobId: jobData.job.id } });
  const res = await req(baseUrl, "POST", `/api/employers/${employer.user.id}/reviews`, {
    token: seeker.token,
    body: { rating: 5, comment: "nice" }
  });
  assert.equal(res.status, 403);
});
test("a shortlisted seeker can review once; duplicate is 409; bad rating is 400", async () => {
  const { employer, seeker } = await shortlistedSetup();
  const ok = await req(baseUrl, "POST", `/api/employers/${employer.user.id}/reviews`, {
    token: seeker.token,
    body: { rating: 5, comment: "Great, responsive employer." }
  });
  assert.equal(ok.status, 201);
  assert.equal(ok.data.review.rating, 5);
  const dup = await req(baseUrl, "POST", `/api/employers/${employer.user.id}/reviews`, {
    token: seeker.token,
    body: { rating: 4, comment: "again" }
  });
  assert.equal(dup.status, 409);
  const { seeker: seeker2 } = await shortlistedSetup();
  const bad = await req(baseUrl, "POST", `/api/employers/${employer.user.id}/reviews`, {
    token: seeker2.token,
    body: { rating: 9, comment: "out of range" }
  });
  assert.equal(bad.status, 400);
});
test("employer reviews list is paginated with meta + averageRating; author can delete", async () => {
  const { employer, seeker } = await shortlistedSetup();
  const created = await req(baseUrl, "POST", `/api/employers/${employer.user.id}/reviews`, {
    token: seeker.token,
    body: { rating: 4, comment: "Solid experience." }
  });
  const list = await req(baseUrl, "GET", `/api/employers/${employer.user.id}/reviews`);
  assert.equal(list.status, 200);
  assert.equal(list.data.data.length, 1);
  assert.equal(list.data.meta.total, 1);
  assert.equal(list.data.meta.averageRating, 4);
  assert.equal(list.data.data[0].author.fullName, seeker.user.fullName);
  const other = await makeUser(baseUrl, { role: "JOB_SEEKER" });
  const forbidden = await req(baseUrl, "DELETE", `/api/reviews/${created.data.review.id}`, { token: other.token });
  assert.equal(forbidden.status, 403);
  const del = await req(baseUrl, "DELETE", `/api/reviews/${created.data.review.id}`, { token: seeker.token });
  assert.equal(del.status, 200);
});
