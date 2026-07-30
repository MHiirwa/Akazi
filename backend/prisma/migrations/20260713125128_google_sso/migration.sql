ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN     "googleId" TEXT;
ALTER TABLE "users" ADD COLUMN     "avatarUrl" TEXT;
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");
