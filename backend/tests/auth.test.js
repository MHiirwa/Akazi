import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { prisma, resetDb, startServer, req } from "./helpers.js";
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
const NEW_USER = {
  fullName: "Aline Uwase",
  email: "aline@test.dev",
  password: "Password123",
  role: "JOB_SEEKER"
};
test("register creates a user and returns a token (no password leaked)", async () => {
  const { status, data } = await req(baseUrl, "POST", "/api/auth/register", { body: NEW_USER });
  assert.equal(status, 201);
  assert.ok(data.token, "expected a JWT token");
  assert.equal(data.user.email, NEW_USER.email);
  assert.equal(data.user.role, "JOB_SEEKER");
  assert.equal(data.user.password, void 0, "password hash must never be returned");
});
test("registering a duplicate email is rejected with 409", async () => {
  await req(baseUrl, "POST", "/api/auth/register", { body: NEW_USER });
  const { status, data } = await req(baseUrl, "POST", "/api/auth/register", { body: NEW_USER });
  assert.equal(status, 409);
  assert.match(data.error, /already exists/i);
});
test("register rejects a too-short password with 400", async () => {
  const { status } = await req(baseUrl, "POST", "/api/auth/register", {
    body: { ...NEW_USER, password: "short" }
  });
  assert.equal(status, 400);
});
test("login succeeds with correct credentials", async () => {
  await req(baseUrl, "POST", "/api/auth/register", { body: NEW_USER });
  const { status, data } = await req(baseUrl, "POST", "/api/auth/login", {
    body: { email: NEW_USER.email, password: NEW_USER.password }
  });
  assert.equal(status, 200);
  assert.ok(data.token);
});
test("login fails with a wrong password (401) and unknown email (401)", async () => {
  await req(baseUrl, "POST", "/api/auth/register", { body: NEW_USER });
  const wrong = await req(baseUrl, "POST", "/api/auth/login", {
    body: { email: NEW_USER.email, password: "WrongPassword1" }
  });
  assert.equal(wrong.status, 401);
  const unknown = await req(baseUrl, "POST", "/api/auth/login", {
    body: { email: "nobody@test.dev", password: "Password123" }
  });
  assert.equal(unknown.status, 401);
});
test("/me returns the current user with a token, 401 without one", async () => {
  const reg = await req(baseUrl, "POST", "/api/auth/register", { body: NEW_USER });
  const withToken = await req(baseUrl, "GET", "/api/auth/me", { token: reg.data.token });
  assert.equal(withToken.status, 200);
  assert.equal(withToken.data.user.email, NEW_USER.email);
  const noToken = await req(baseUrl, "GET", "/api/auth/me");
  assert.equal(noToken.status, 401);
});
test("forgot-password returns the same generic response for known and unknown emails", async () => {
  await req(baseUrl, "POST", "/api/auth/register", { body: NEW_USER });
  const known = await req(baseUrl, "POST", "/api/auth/forgot-password", {
    body: { email: NEW_USER.email }
  });
  const unknown = await req(baseUrl, "POST", "/api/auth/forgot-password", {
    body: { email: "ghost@test.dev" }
  });
  assert.equal(known.status, 200);
  assert.equal(unknown.status, 200);
  assert.deepEqual(known.data, unknown.data, "responses must be identical (no user enumeration)");
});
test("reset-password consumes a valid token, then the token can't be reused", async () => {
  const reg = await req(baseUrl, "POST", "/api/auth/register", { body: NEW_USER });
  const rawToken = "raw-" + crypto.randomBytes(8).toString("hex");
  const hash = crypto.createHash("sha256").update(rawToken).digest("hex");
  await prisma.user.update({
    where: { id: reg.data.user.id },
    data: { resetTokenHash: hash, resetTokenExpiresAt: new Date(Date.now() + 36e5) }
  });
  const reset = await req(baseUrl, "POST", "/api/auth/reset-password", {
    body: { token: rawToken, password: "BrandNewPass1" }
  });
  assert.equal(reset.status, 200);
  const login = await req(baseUrl, "POST", "/api/auth/login", {
    body: { email: NEW_USER.email, password: "BrandNewPass1" }
  });
  assert.equal(login.status, 200);
  const reuse = await req(baseUrl, "POST", "/api/auth/reset-password", {
    body: { token: rawToken, password: "AnotherPass1" }
  });
  assert.equal(reuse.status, 400);
});
test("reset-password rejects an invalid/expired token with 400", async () => {
  const { status } = await req(baseUrl, "POST", "/api/auth/reset-password", {
    body: { token: "does-not-exist", password: "Password123" }
  });
  assert.equal(status, 400);
});
