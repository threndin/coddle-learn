-- AlterTable
ALTER TABLE "users" ADD COLUMN "points" INTEGER NOT NULL DEFAULT 0;

-- Award onboarding points to learners who already finished setup.
UPDATE "users" SET "points" = 50 WHERE "onboarding_completed_at" IS NOT NULL;
