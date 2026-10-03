-- AlterTable
ALTER TABLE "users" ADD COLUMN "practice_days" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
