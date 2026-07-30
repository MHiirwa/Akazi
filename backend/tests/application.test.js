import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
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
async function seedEmployerJobAndSeeker() {
  const employer = await makeUser(baseUrl, { role: "EMPLOYER", verified: true });
  const seeker = await makeUser(baseUrl, { role: "JOB_SEEKER" });
  const { data } = await req(baseUrl, "POST", "/api/jobs", {
    token: employer.token,
    body: VALID_JOB
  });
  return { employer, seeker, job: data.job };
}
test("a verified employer can create a job; an unverified one cannot", async () => {
  const unverified = await makeUser(baseUrl, { role: "EMPLOYER", verified: false });
  const blocked = await req(baseUrl, "POST", "/api/jobs", {
    token: unverified.token,
    body: VALID_JOB
  });
  assert.equal(blocked.status, 403);
  const verified = await makeUser(baseUrl, { role: "EMPLOYER", verified: true });
  const ok = await req(baseUrl, "POST", "/api/jobs", { token: verified.token, body: VALID_JOB });
  assert.equal(ok.status, 201);
  assert.equal(ok.data.job.jobType, "FULL_TIME");
});
test("a published job can be fetched by id; unknown id returns 404", async () => {
  const { job } = await seedEmployerJobAndSeeker();
  const found = await req(baseUrl, "GET", `/api/jobs/${job.id}`);
  assert.equal(found.status, 200);
  assert.equal(found.data.job.id, job.id);
  assert.equal(found.data.job.employer.fullName, "Test EMPLOYER");
  const missing = await req(baseUrl, "GET", "/api/jobs/00000000-0000-0000-0000-000000000000");
  assert.equal(missing.status, 404);
});
test("creating a job with an invalid jobType is rejected with 400", async () => {
  const employer = await makeUser(baseUrl, { role: "EMPLOYER", verified: true });
  const { status, data } = await req(baseUrl, "POST", "/api/jobs", {
    token: employer.token,
    body: { ...VALID_JOB, jobType: "gig" }
  });
  assert.equal(status, 400);
  assert.match(JSON.stringify(data), /jobType|Job type/i);
});
test("a job seeker can apply to a job once; a second attempt is 409", async () => {
  const { seeker, job } = await seedEmployerJobAndSeeker();
  const first = await req(baseUrl, "POST", "/api/applications", {
    token: seeker.token,
    body: { jobId: job.id }
  });
  assert.equal(first.status, 201);
  const second = await req(baseUrl, "POST", "/api/applications", {
    token: seeker.token,
    body: { jobId: job.id }
  });
  assert.equal(second.status, 409);
});
test("applying to a non-existent job returns 404", async () => {
  const seeker = await makeUser(baseUrl, { role: "JOB_SEEKER" });
  const { status } = await req(baseUrl, "POST", "/api/applications", {
    token: seeker.token,
    body: { jobId: "00000000-0000-0000-0000-000000000000" }
  });
  assert.equal(status, 404);
});
test("an employer sees applicants for their own job but not someone else's", async () => {
  const { employer, seeker, job } = await seedEmployerJobAndSeeker();
  await req(baseUrl, "POST", "/api/applications", { token: seeker.token, body: { jobId: job.id } });
  const own = await req(baseUrl, "GET", `/api/applications/job/${job.id}`, { token: employer.token });
  assert.equal(own.status, 200);
  assert.equal(own.data.applications.length, 1);
  assert.equal(own.data.applications[0].applicant.email, seeker.user.email);
  const otherEmployer = await makeUser(baseUrl, { role: "EMPLOYER", verified: true });
  const forbidden = await req(baseUrl, "GET", `/api/applications/job/${job.id}`, {
    token: otherEmployer.token
  });
  assert.equal(forbidden.status, 403);
});
test("an employer can update an applicant's status", async () => {
  const { employer, seeker, job } = await seedEmployerJobAndSeeker();
  const applied = await req(baseUrl, "POST", "/api/applications", {
    token: seeker.token,
    body: { jobId: job.id }
  });
  const appId = applied.data.application.id;
  const updated = await req(baseUrl, "PATCH", `/api/applications/${appId}/status`, {
    token: employer.token,
    body: { status: "ACCEPTED" }
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.application.status, "ACCEPTED");
});
test("a job seeker cannot post a job (role guard, 403)", async () => {
  const seeker = await makeUser(baseUrl, { role: "JOB_SEEKER" });
  const { status } = await req(baseUrl, "POST", "/api/jobs", { token: seeker.token, body: VALID_JOB });
  assert.equal(status, 403);
});
