-- AlterTable
ALTER TABLE "roadmaps" ADD COLUMN "skill_slugs" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "roadmap_steps" ADD COLUMN "learnings" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "roadmap_steps" ADD COLUMN "practice" TEXT NOT NULL DEFAULT '';
ALTER TABLE "roadmap_steps" ADD COLUMN "branch_key" TEXT;

-- AlterTable
ALTER TABLE "user_roadmaps" ADD COLUMN "is_primary" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "user_step_progress" ADD COLUMN "points_awarded" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "user_roadmaps_user_id_is_primary_idx" ON "user_roadmaps"("user_id", "is_primary");

-- CreateTable
CREATE TABLE "user_resource_bookmarks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "step_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_resource_bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_resource_bookmarks_step_id_idx" ON "user_resource_bookmarks"("step_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_resource_bookmarks_user_id_step_id_url_key" ON "user_resource_bookmarks"("user_id", "step_id", "url");

-- AddForeignKey
ALTER TABLE "user_resource_bookmarks" ADD CONSTRAINT "user_resource_bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_resource_bookmarks" ADD CONSTRAINT "user_resource_bookmarks_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "roadmap_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
