-- AlterTable: in-app notification group mutes (defaults on)
ALTER TABLE "users" ADD COLUMN "notify_account" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "notify_community" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "notify_learning" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "notify_mentorship" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "notify_moderation" BOOLEAN NOT NULL DEFAULT true;
