-- AlterTable: usernames for public profiles
ALTER TABLE "users" ADD COLUMN "username" TEXT;

-- Backfill unique usernames from name + short id suffix
UPDATE "users"
SET "username" = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(COALESCE(NULLIF(TRIM("name"), ''), 'learner')), '[^a-z0-9]+', '-', 'g')),
      '^-+|-+$',
      '',
      'g'
    ),
    '-{2,}',
    '-',
    'g'
  )
) || '-' || RIGHT("id", 6);

-- Ensure uniqueness if the truncated slug collided
UPDATE "users" u
SET "username" = u."username" || '-' || SUBSTRING(md5(u."id") FROM 1 FOR 4)
WHERE EXISTS (
  SELECT 1 FROM "users" other
  WHERE other."username" = u."username" AND other."id" <> u."id"
);

ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateTable
CREATE TABLE "follows" (
    "id" TEXT NOT NULL,
    "follower_id" TEXT NOT NULL,
    "following_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "follows_follower_id_following_id_key" ON "follows"("follower_id", "following_id");

CREATE INDEX "follows_following_id_idx" ON "follows"("following_id");

ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
