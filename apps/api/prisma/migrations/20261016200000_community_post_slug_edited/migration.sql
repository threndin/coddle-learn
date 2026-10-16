-- AlterTable
ALTER TABLE "community_posts" ADD COLUMN "slug" TEXT,
ADD COLUMN "edited_at" TIMESTAMP(3);

-- Backfill slugs from titles.
UPDATE "community_posts"
SET "slug" = NULLIF(
  LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM("title"), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')),
  ''
);

UPDATE "community_posts"
SET "slug" = 'post-' || RIGHT("id", 8)
WHERE "slug" IS NULL;

-- Disambiguate collisions by appending a short id suffix.
UPDATE "community_posts" AS p
SET "slug" = LEFT(p."slug", 55) || '-' || RIGHT(p."id", 6)
WHERE p."ctid" <> (
  SELECT MIN(other."ctid")
  FROM "community_posts" AS other
  WHERE other."slug" = p."slug"
);

ALTER TABLE "community_posts" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "community_posts_slug_key" ON "community_posts"("slug");
