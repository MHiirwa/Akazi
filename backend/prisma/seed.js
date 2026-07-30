import bcrypt from "bcryptjs";
import prisma from "../src/config/prisma.js";
const PASSWORD = "Password123";
async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@akazi.test" },
    update: { role: "ADMIN", password: passwordHash },
    create: {
      fullName: "Akazi Admin",
      email: "admin@akazi.test",
      password: passwordHash,
      role: "ADMIN"
    }
  });
  const employer = await prisma.user.upsert({
    where: { email: "employer@akazi.test" },
    update: { role: "EMPLOYER", employerStatus: "VERIFIED", password: passwordHash },
    create: {
      fullName: "Grace Umutoni",
      email: "employer@akazi.test",
      password: passwordHash,
      role: "EMPLOYER",
      employerStatus: "VERIFIED",
      phone: "+250788000001"
    }
  });
  const seeker = await prisma.user.upsert({
    where: { email: "seeker@akazi.test" },
    update: { role: "JOB_SEEKER", password: passwordHash },
    create: {
      fullName: "Eric Mugisha",
      email: "seeker@akazi.test",
      password: passwordHash,
      role: "JOB_SEEKER",
      phone: "+250788000002",
      skills: ["JavaScript", "Node.js", "React"]
    }
  });
  const existingJobs = await prisma.job.count({ where: { employerId: employer.id } });
  let firstJob;
  if (existingJobs === 0) {
    firstJob = await prisma.job.create({
      data: {
        title: "Backend Engineer",
        description: "Build and maintain the APIs powering Akazi. You'll work with Node.js, Express, and PostgreSQL to ship features end to end.",
        location: "Kigali",
        industry: "Technology",
        jobType: "FULL_TIME",
        salaryMin: 8e5,
        salaryMax: 15e5,
        employerId: employer.id
      }
    });
    await prisma.job.create({
      data: {
        title: "Product Designer",
        description: "Own the end-to-end design of Akazi's job-seeker experience, from research and wireframes through polished, accessible UI.",
        location: "Remote",
        industry: "Design",
        jobType: "CONTRACT",
        salaryMin: 6e5,
        salaryMax: 1e6,
        employerId: employer.id
      }
    });
  } else {
    firstJob = await prisma.job.findFirst({ where: { employerId: employer.id } });
  }
  if (firstJob) {
    const existingApp = await prisma.application.findUnique({
      where: { jobId_applicantId: { jobId: firstJob.id, applicantId: seeker.id } }
    });
    if (!existingApp) {
      await prisma.application.create({
        data: { jobId: firstJob.id, applicantId: seeker.id }
      });
    }
  }
  console.log("Seed complete. Demo accounts (password: %s):", PASSWORD);
  console.log("  Admin     %s", admin.email);
  console.log("  Employer  %s  (VERIFIED)", employer.email);
  console.log("  Seeker    %s", seeker.email);
}
main().catch((err) => {
  console.error("Seed failed:", err);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
