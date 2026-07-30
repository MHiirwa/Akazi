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
test("a job can be published with explicit null salary (empty salary fields from the form)", async () => {
  const employer = await makeUser(baseUrl, { role: "EMPLOYER", verified: true });
  const res = await req(baseUrl, "POST", "/api/jobs", {
    token: employer.token,
    body: {
      title: "No Salary Role",
      description: "A description comfortably over the twenty character minimum.",
      location: "Kigali",
      industry: "Technology",
      jobType: "FULL_TIME",
      salaryMin: null,
      salaryMax: null,
      remote: false,
      requiredSkills: [],
    },
  });
  assert.equal(res.status, 201);
  assert.equal(res.data.job.salaryMin, null);
  assert.equal(res.data.job.status, "PUBLISHED");
});
test("a suspended user is blocked from protected routes (403), even with a valid token", async () => {
  const seeker = await makeUser(baseUrl, { role: "JOB_SEEKER" });
  const before2 = await req(baseUrl, "GET", "/api/auth/me", { token: seeker.token });
  assert.equal(before2.status, 200);
  const adminToken = await makeAdminToken();
  const suspend = await req(baseUrl, "PATCH", `/api/admin/users/${seeker.user.id}/suspend`, {
    token: adminToken,
    body: { suspended: true }
  });
  assert.equal(suspend.status, 200);
  const after2 = await req(baseUrl, "GET", "/api/auth/me", { token: seeker.token });
  assert.equal(after2.status, 403);
  assert.match(after2.data.error, /suspended/i);
});
test("email is case-insensitive: login matches any case and no duplicate account is created", async () => {
  const reg = await req(baseUrl, "POST", "/api/auth/register", {
    body: { fullName: "Mixed Case", email: "Mixed@Case.dev", password: "Password123", role: "JOB_SEEKER" }
  });
  assert.equal(reg.status, 201);
  assert.equal(reg.data.user.email, "mixed@case.dev", "stored email should be normalized to lowercase");
  const login = await req(baseUrl, "POST", "/api/auth/login", {
    body: { email: "MIXED@CASE.DEV", password: "Password123" }
  });
  assert.equal(login.status, 200);
  const dup = await req(baseUrl, "POST", "/api/auth/register", {
    body: { fullName: "Impostor", email: "mIxEd@cAsE.dev", password: "Password123", role: "JOB_SEEKER" }
  });
  assert.equal(dup.status, 409);
});
test("admin action on a non-existent user id returns 404, not 500", async () => {
  const adminToken = await makeAdminToken();
  const res = await req(baseUrl, "PATCH", "/api/admin/users/00000000-0000-0000-0000-000000000000/suspend", {
    token: adminToken,
    body: { suspended: true }
  });
  assert.equal(res.status, 404);
});
test("salary search filters as a range overlap and keeps jobs with undisclosed salary", async () => {
  const employer = await makeUser(baseUrl, { role: "EMPLOYER", verified: true });
  const post = (extra) => req(baseUrl, "POST", "/api/jobs", { token: employer.token, body: { ...VALID_JOB, ...extra } });
  await post({ title: "Low band", salaryMin: 5e5, salaryMax: 8e5 });
  await post({ title: "High band", salaryMin: 1e6, salaryMax: 15e5 });
  await post({ title: "Undisclosed" });
  const titles = (data) => data.jobs.map((j) => j.title).sort();
  const floor = await req(baseUrl, "GET", "/api/jobs?minSalary=900000");
  assert.deepEqual(titles(floor.data), ["High band", "Undisclosed"]);
  const ceiling = await req(baseUrl, "GET", "/api/jobs?maxSalary=600000");
  assert.deepEqual(titles(ceiling.data), ["Low band", "Undisclosed"]);
});
