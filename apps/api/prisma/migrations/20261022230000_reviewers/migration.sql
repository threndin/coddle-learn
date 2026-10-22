-- AlterTable
ALTER TABLE "users" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'learner';

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- AlterTable
ALTER TABLE "resources" ADD COLUMN "reviewed_at" TIMESTAMP(3),
ADD COLUMN "reviewed_by_user_id" TEXT,
ADD COLUMN "flagged_at" TIMESTAMP(3),
ADD COLUMN "flagged_by_user_id" TEXT,
ADD COLUMN "flag_note" TEXT;

-- CreateIndex
CREATE INDEX "resources_flagged_at_idx" ON "resources"("flagged_at");

-- CreateIndex
CREATE INDEX "resources_reviewed_by_user_id_idx" ON "resources"("reviewed_by_user_id");

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_flagged_by_user_id_fkey" FOREIGN KEY ("flagged_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "tools" ADD COLUMN "reviewed_at" TIMESTAMP(3),
ADD COLUMN "reviewed_by_user_id" TEXT,
ADD COLUMN "flagged_at" TIMESTAMP(3),
ADD COLUMN "flagged_by_user_id" TEXT,
ADD COLUMN "flag_note" TEXT;

-- CreateIndex
CREATE INDEX "tools_flagged_at_idx" ON "tools"("flagged_at");

-- CreateIndex
CREATE INDEX "tools_reviewed_by_user_id_idx" ON "tools"("reviewed_by_user_id");

-- AddForeignKey
ALTER TABLE "tools" ADD CONSTRAINT "tools_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tools" ADD CONSTRAINT "tools_flagged_by_user_id_fkey" FOREIGN KEY ("flagged_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "courses" ADD COLUMN "flagged_at" TIMESTAMP(3),
ADD COLUMN "flagged_by_user_id" TEXT,
ADD COLUMN "flag_note" TEXT;

-- CreateIndex
CREATE INDEX "courses_flagged_at_idx" ON "courses"("flagged_at");

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_flagged_by_user_id_fkey" FOREIGN KEY ("flagged_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN "flagged_at" TIMESTAMP(3),
ADD COLUMN "flagged_by_user_id" TEXT,
ADD COLUMN "flag_note" TEXT;

-- CreateIndex
CREATE INDEX "projects_flagged_at_idx" ON "projects"("flagged_at");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_flagged_by_user_id_fkey" FOREIGN KEY ("flagged_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
