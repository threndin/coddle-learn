-- AlterTable: public profile section visibility (defaults public)
ALTER TABLE "users" ADD COLUMN "show_roadmaps_public" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "show_projects_public" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "show_posts_public" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "show_skills_public" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "show_credentials_public" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "show_achievements_public" BOOLEAN NOT NULL DEFAULT true;
