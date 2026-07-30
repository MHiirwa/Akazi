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
test("suspending an employer hides their published jobs from search and detail", async () => {
  const employer = await makeUser(baseUrl, { role: "EMPLOYER", verified: true });
  const posted = await req(baseUrl, "POST", "/api/jobs", { token: employer.token, body: VALID_JOB });
  const jobId = posted.data.job.id;
  const before2 = await req(baseUrl, "GET", "/api/jobs");
  assert.equal(before2.data.jobs.length, 1);
  assert.equal((await req(baseUrl, "GET", `/api/jobs/${jobId}`)).status, 200);
  const adminToken = await makeAdminToken();
  await req(baseUrl, "PATCH", `/api/admin/users/${employer.user.id}/suspend`, {
    token: adminToken,
    body: { suspended: true }
  });
  const after2 = await req(baseUrl, "GET", "/api/jobs");
  assert.equal(after2.data.jobs.length, 0);
  assert.equal((await req(baseUrl, "GET", `/api/jobs/${jobId}`)).status, 404);
  await req(baseUrl, "PATCH", `/api/admin/users/${employer.user.id}/suspend`, {
    token: adminToken,
    body: { suspended: false }
  });
  const restored = await req(baseUrl, "GET", "/api/jobs");
  assert.equal(restored.data.jobs.length, 1);
});
test("a suspended user cannot log in (403)", async () => {
  const seeker = await makeUser(baseUrl, { role: "JOB_SEEKER" });
  const adminToken = await makeAdminToken();
  await req(baseUrl, "PATCH", `/api/admin/users/${seeker.user.id}/suspend`, {
    token: adminToken,
    body: { suspended: true }
  });
  const login = await req(baseUrl, "POST", "/api/auth/login", {
    body: { email: seeker.user.email, password: "Password123" }
  });
  assert.equal(login.status, 403);
  assert.match(login.data.error, /suspended/i);
});
test("posting a job with salaryMax < salaryMin is rejected (400)", async () => {
  const employer = await makeUser(baseUrl, { role: "EMPLOYER", verified: true });
  const res = await req(baseUrl, "POST", "/api/jobs", {
    token: employer.token,
    body: { ...VALID_JOB, salaryMin: 1e3, salaryMax: 500 }
  });
  assert.equal(res.status, 400);
  assert.match(JSON.stringify(res.data), /salaryMax/i);
});
test("admin suspend rejects a non-boolean body (400)", async () => {
  const seeker = await makeUser(baseUrl, { role: "JOB_SEEKER" });
  const adminToken = await makeAdminToken();
  const res = await req(baseUrl, "PATCH", `/api/admin/users/${seeker.user.id}/suspend`, {
    token: adminToken,
    body: { suspended: "yes" }
  });
  assert.equal(res.status, 400);
});
