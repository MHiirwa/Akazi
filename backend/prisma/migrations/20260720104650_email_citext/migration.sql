CREATE EXTENSION IF NOT EXISTS citext;
UPDATE "users" SET "email" = lower("email");
ALTER TABLE "users" ALTER COLUMN "email" SET DATA TYPE CITEXT;
