import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma, startServer, req } from "./helpers.js";

let baseUrl;
let close;

before(async () => {
  ({ baseUrl, close } = await startServer());
});

after(async () => {
  await close();
  await prisma.$disconnect();
});

const unknownId = "00000000-0000-4000-8000-000000000000";
const checks = [
  ["POST", "/api/auth/register", {}, [400]],
  ["POST", "/api/auth/login", {}, [400]],
  ["POST", "/api/auth/google", {}, [400]],
  ["POST", "/api/auth/forgot-password", {}, [400]],
  ["POST", "/api/auth/reset-password", {}, [400]],
  ["GET", "/api/auth/me", null, [401]],
  ["PATCH", "/api/auth/me", {}, [401]],
  ["GET", "/api/auth/me/completion", null, [401]],
  ["POST", "/api/auth/me/avatar", {}, [401]],
  ["POST", "/api/auth/me/resume", {}, [401]],
  ["GET", "/api/jobs", null, [200]],
  ["POST", "/api/jobs", {}, [401]],
  ["DELETE", `/api/jobs/${unknownId}`, null, [401]],
  ["PATCH", `/api/jobs/${unknownId}`, {}, [401]],
  ["GET", "/api/jobs/mine/list", null, [401]],
  ["GET", "/api/jobs/mine/applicant-counts", null, [401]],
  ["GET", "/api/jobs/stats", null, [200]],
  ["GET", `/api/jobs/${unknownId}`, null, [404]],
  ["POST", "/api/applications", {}, [401]],
  ["PATCH", `/api/applications/${unknownId}/withdraw`, {}, [401]],
  ["GET", "/api/applications/mine", null, [401]],
  ["GET", `/api/applications/job/${unknownId}`, null, [401]],
  ["PATCH", `/api/applications/${unknownId}/status`, {}, [401]],
  ["GET", "/api/admin/users", null, [401]],
  ["PATCH", `/api/admin/users/${unknownId}/suspend`, {}, [401]],
  ["PATCH", `/api/admin/users/${unknownId}/employer-status`, {}, [401]],
  ["PATCH", `/api/admin/jobs/${unknownId}/remove`, {}, [401]],
  ["GET", "/api/users/stats", null, [401]],
  ["GET", `/api/employers/${unknownId}/reviews`, null, [404]],
  ["POST", `/api/employers/${unknownId}/reviews`, {}, [401]],
  ["DELETE", `/api/reviews/${unknownId}`, null, [401]],
  ["POST", "/api/job-alerts", {}, [400]],
  ["POST", "/api/job-alerts/unsubscribe", {}, [200]]
];

for (const [method, path, requestBody, expectedStatuses] of checks) {
  test(`${method} ${path}`, async () => {
    const response = await req(baseUrl, method, path, requestBody === null ? {} : { body: requestBody });
    assert.ok(
      expectedStatuses.includes(response.status),
      `Expected ${expectedStatuses.join(" or ")}, received ${response.status}`
    );
  });
}
