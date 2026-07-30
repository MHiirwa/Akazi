CREATE TABLE "job_alerts" (
    "id" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "keyword" TEXT,
    "location" TEXT,
    "jobType" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "unsubToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_alerts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "job_alerts_email_key" ON "job_alerts"("email");
CREATE UNIQUE INDEX "job_alerts_unsubToken_key" ON "job_alerts"("unsubToken");
