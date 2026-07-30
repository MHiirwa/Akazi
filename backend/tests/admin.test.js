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

async function makeAdmin() {
  const email = `admin-${Date.now()}-${Math.random().toString(16).slice(2)}@test.dev`;
  const user = await prisma.user.create({
    data: { fullName: "Test Admin", email, password: await bcrypt.hash("Password123", 10), role: "ADMIN" }
  });
  const login = await req(baseUrl, "POST", "/api/auth/login", { body: { email, password: "Password123" } });
  return { id: user.id, token: login.data.token };
}
async function seedEmployerAndJob() {
  const employer = await makeUser(baseUrl, { role: "EMPLOYER", verified: true });
  const { data } = await req(baseUrl, "POST", "/api/jobs", { token: employer.token, body: VALID_JOB });
  return { employer, job: data.job };
}

test("the role-change endpoint is gone (admins can't switch a user's role)", async () => {
  const admin = await makeAdmin();
  const seeker = await makeUser(baseUrl, { role: "JOB_SEEKER" });
  const res = await req(baseUrl, "PATCH", `/api/admin/users/${seeker.user.id}/role`, {
    token: admin.token,
    body: { role: "EMPLOYER" }
  });
  assert.equal(res.status, 404); // route removed → Route not found
  const persisted = await prisma.user.findUnique({ where: { id: seeker.user.id } });
  assert.equal(persisted.role, "JOB_SEEKER"); // unchanged
});

test("admin cannot suspend their own account (400)", async () => {
  const admin = await makeAdmin();
  const suspendRes = await req(baseUrl, "PATCH", `/api/admin/users/${admin.id}/suspend`, {
    token: admin.token,
    body: { suspended: true }
  });
  assert.equal(suspendRes.status, 400);
});

test("listUsers returns full employer details for admin review", async () => {
  const admin = await makeAdmin();
  const employer = await makeUser(baseUrl, { role: "EMPLOYER" });
  await prisma.user.update({
    where: { id: employer.user.id },
    data: { phone: "+250788000123", location: "Kigali", website: "acme.example", bio: "We build things." }
  });
  const res = await req(baseUrl, "GET", "/api/admin/users?role=EMPLOYER", { token: admin.token });
  assert.equal(res.status, 200);
  const row = res.data.users.find((u) => u.id === employer.user.id);
  assert.ok(row, "employer is listed");
  assert.equal(row.phone, "+250788000123");
  assert.equal(row.location, "Kigali");
  assert.equal(row.bio, "We build things.");
  assert.ok(row._count && typeof row._count.jobsPosted === "number", "includes jobsPosted count");
  assert.ok(!("password" in row), "never leaks the password hash");
});

test("admin job list returns all statuses with employer + applicant counts", async () => {
  const admin = await makeAdmin();
  const { employer, job } = await seedEmployerAndJob();
  const seeker = await makeUser(baseUrl, { role: "JOB_SEEKER" });
  await req(baseUrl, "POST", "/api/applications", { token: seeker.token, body: { jobId: job.id } });
  // Remove it so it would be hidden from the public search but must still show here.
  await req(baseUrl, "PATCH", `/api/admin/jobs/${job.id}/remove`, { token: admin.token });

  const res = await req(baseUrl, "GET", "/api/admin/jobs", { token: admin.token });
  assert.equal(res.status, 200);
  const listed = res.data.jobs.find((j) => j.id === job.id);
  assert.ok(listed, "removed job is still visible to admin");
  assert.equal(listed.status, "REMOVED");
  assert.equal(listed.employer.id, employer.user.id);
  assert.equal(listed._count.applications, 1);
});

test("admin can filter jobs by status", async () => {
  const admin = await makeAdmin();
  const { job } = await seedEmployerAndJob();
  await req(baseUrl, "PATCH", `/api/admin/jobs/${job.id}/remove`, { token: admin.token });

  const removed = await req(baseUrl, "GET", "/api/admin/jobs?status=REMOVED", { token: admin.token });
  assert.equal(removed.data.jobs.length, 1);
  const published = await req(baseUrl, "GET", "/api/admin/jobs?status=PUBLISHED", { token: admin.token });
  assert.equal(published.data.jobs.length, 0);
});

test("admin can restore a removed job back to public listings", async () => {
  const admin = await makeAdmin();
  const { job } = await seedEmployerAndJob();
  await req(baseUrl, "PATCH", `/api/admin/jobs/${job.id}/remove`, { token: admin.token });

  const restore = await req(baseUrl, "PATCH", `/api/admin/jobs/${job.id}/restore`, { token: admin.token });
  assert.equal(restore.status, 200);
  assert.equal(restore.data.job.status, "PUBLISHED");
  const publicSearch = await req(baseUrl, "GET", "/api/jobs", {});
  assert.ok(publicSearch.data.jobs.some((j) => j.id === job.id), "restored job is public again");
});

test("admin user filter narrows by role", async () => {
  const admin = await makeAdmin();
  await makeUser(baseUrl, { role: "JOB_SEEKER" });
  await makeUser(baseUrl, { role: "EMPLOYER" });

  const res = await req(baseUrl, "GET", "/api/admin/users?role=EMPLOYER", { token: admin.token });
  assert.equal(res.status, 200);
  assert.ok(res.data.users.length >= 1);
  assert.ok(res.data.users.every((u) => u.role === "EMPLOYER"));
});

test("the new admin routes require an admin (403 for non-admins)", async () => {
  const seeker = await makeUser(baseUrl, { role: "JOB_SEEKER" });
  const other = await makeUser(baseUrl, { role: "EMPLOYER" });
  const statusRes = await req(baseUrl, "PATCH", `/api/admin/users/${other.user.id}/employer-status`, {
    token: seeker.token,
    body: { status: "VERIFIED" }
  });
  assert.equal(statusRes.status, 403);
  const jobsRes = await req(baseUrl, "GET", "/api/admin/jobs", { token: seeker.token });
  assert.equal(jobsRes.status, 403);
});
