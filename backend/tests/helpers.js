import "./setup.js";
import app from "../src/app.js";
import prisma from "../src/config/prisma.js";
import { clearCache } from "../src/config/cache.js";
async function resetDb() {
  clearCache();
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "reviews", "applications", "jobs", "users", "job_alerts" RESTART IDENTITY CASCADE'
  );
}
function startServer() {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise((r) => server.close(r))
      });
    });
  });
}
async function req(baseUrl, method, path, { body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(baseUrl + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : void 0
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}
async function makeUser(baseUrl, { role = "JOB_SEEKER", email, verified = false } = {}) {
  const { data } = await req(baseUrl, "POST", "/api/auth/register", {
    body: {
      fullName: `Test ${role}`,
      email: email || `${role.toLowerCase()}-${Date.now()}-${Math.random().toString(16).slice(2)}@test.dev`,
      password: "Password123",
      role
    }
  });
  if (role === "EMPLOYER" && verified) {
    await prisma.user.update({
      where: { id: data.user.id },
      data: { employerStatus: "VERIFIED" }
    });
  }
  return data;
}
const VALID_JOB = {
  title: "Test Engineer",
  description: "A description that is comfortably over the twenty character minimum.",
  location: "Kigali",
  industry: "Technology",
  jobType: "FULL_TIME"
};
export {
  VALID_JOB,
  makeUser,
  prisma,
  req,
  resetDb,
  startServer
};
