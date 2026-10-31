-- AlterTable
ALTER TABLE "users" ADD COLUMN "suspended_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "users_suspended_at_idx" ON "users"("suspended_at");
