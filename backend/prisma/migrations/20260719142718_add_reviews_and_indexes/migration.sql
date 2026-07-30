CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "employerId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "reviews_employerId_idx" ON "reviews"("employerId");
CREATE INDEX "reviews_authorId_idx" ON "reviews"("authorId");
CREATE UNIQUE INDEX "reviews_employerId_authorId_key" ON "reviews"("employerId", "authorId");
CREATE INDEX "jobs_jobType_idx" ON "jobs"("jobType");
CREATE INDEX "jobs_salaryMin_idx" ON "jobs"("salaryMin");
CREATE INDEX "users_role_idx" ON "users"("role");
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
