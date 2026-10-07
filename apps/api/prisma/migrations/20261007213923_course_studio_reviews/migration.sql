-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "accent" TEXT NOT NULL DEFAULT '#004CC8',
ADD COLUMN     "custom_thumbnail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "review_note" TEXT,
ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_by_user_id" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'draft',
ADD COLUMN     "submitted_at" TIMESTAMP(3),
ALTER COLUMN "sort_order" SET DEFAULT 100;

-- Backfill: courses that were already live stay live.
UPDATE "courses"
SET "status" = 'published',
    "submitted_at" = "published_at",
    "reviewed_at" = "published_at"
WHERE "published_at" IS NOT NULL;

-- CreateTable
CREATE TABLE "course_reviews" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "course_reviews_course_id_created_at_idx" ON "course_reviews"("course_id", "created_at");

-- CreateIndex
CREATE INDEX "course_reviews_user_id_idx" ON "course_reviews"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "course_reviews_course_id_user_id_key" ON "course_reviews"("course_id", "user_id");

-- CreateIndex
CREATE INDEX "courses_status_sort_order_idx" ON "courses"("status", "sort_order");

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_reviews" ADD CONSTRAINT "course_reviews_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_reviews" ADD CONSTRAINT "course_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
