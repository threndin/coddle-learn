-- CreateTable
CREATE TABLE "resources" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "submitted_by_user_id" TEXT,
    "review_note" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_skills" (
    "resource_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_skills_pkey" PRIMARY KEY ("resource_id","skill_id")
);

-- CreateTable
CREATE TABLE "roadmap_step_resources" (
    "step_id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "roadmap_step_resources_pkey" PRIMARY KEY ("step_id","resource_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "resources_url_key" ON "resources"("url");
CREATE INDEX "resources_status_published_at_idx" ON "resources"("status", "published_at");
CREATE INDEX "resources_submitted_by_user_id_created_at_idx" ON "resources"("submitted_by_user_id", "created_at");
CREATE INDEX "resource_skills_skill_id_idx" ON "resource_skills"("skill_id");
CREATE INDEX "roadmap_step_resources_resource_id_idx" ON "roadmap_step_resources"("resource_id");

-- Backfill: one resource per distinct URL in the step JSON. Level comes from the
-- first roadmap that uses it; the seed then fills descriptions and skills.
INSERT INTO "resources" ("id", "url", "title", "type", "level", "status", "published_at", "updated_at")
SELECT DISTINCT ON (item->>'url')
    'res_' || md5(item->>'url'),
    item->>'url',
    item->>'title',
    item->>'type',
    r."level",
    'published',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "roadmap_steps" s
JOIN "roadmaps" r ON r."id" = s."roadmap_id"
CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(s."resources") = 'array' THEN s."resources" ELSE '[]'::jsonb END
) AS item
WHERE item ? 'url' AND item ? 'title' AND item ? 'type'
ORDER BY item->>'url', r."sort_order", s."sort_order";

INSERT INTO "roadmap_step_resources" ("step_id", "resource_id", "sort_order")
SELECT s."id", res."id", MIN(item.ord)::int - 1
FROM "roadmap_steps" s
CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(s."resources") = 'array' THEN s."resources" ELSE '[]'::jsonb END
) WITH ORDINALITY AS item(value, ord)
JOIN "resources" res ON res."url" = item.value->>'url'
GROUP BY s."id", res."id";

-- Bookmarks move from (step, url) to resource. A learner who saved the same URL
-- on two steps keeps their earliest bookmark.
ALTER TABLE "user_resource_bookmarks" ADD COLUMN "resource_id" TEXT;

UPDATE "user_resource_bookmarks" b
SET "resource_id" = res."id"
FROM "resources" res
WHERE res."url" = b."url";

DELETE FROM "user_resource_bookmarks" WHERE "resource_id" IS NULL;

DELETE FROM "user_resource_bookmarks" b
USING "user_resource_bookmarks" keep
WHERE b."user_id" = keep."user_id"
  AND b."resource_id" = keep."resource_id"
  AND (keep."created_at", keep."id") < (b."created_at", b."id");

ALTER TABLE "user_resource_bookmarks" DROP CONSTRAINT "user_resource_bookmarks_step_id_fkey";
DROP INDEX "user_resource_bookmarks_step_id_idx";
DROP INDEX "user_resource_bookmarks_user_id_step_id_url_key";
ALTER TABLE "user_resource_bookmarks"
    DROP COLUMN "step_id",
    DROP COLUMN "title",
    DROP COLUMN "url",
    ALTER COLUMN "resource_id" SET NOT NULL;

CREATE INDEX "user_resource_bookmarks_resource_id_idx" ON "user_resource_bookmarks"("resource_id");
CREATE UNIQUE INDEX "user_resource_bookmarks_user_id_resource_id_key" ON "user_resource_bookmarks"("user_id", "resource_id");

-- AlterTable
ALTER TABLE "roadmap_steps" DROP COLUMN "resources";

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_submitted_by_user_id_fkey" FOREIGN KEY ("submitted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "resource_skills" ADD CONSTRAINT "resource_skills_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resource_skills" ADD CONSTRAINT "resource_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "roadmap_step_resources" ADD CONSTRAINT "roadmap_step_resources_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "roadmap_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "roadmap_step_resources" ADD CONSTRAINT "roadmap_step_resources_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_resource_bookmarks" ADD CONSTRAINT "user_resource_bookmarks_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
