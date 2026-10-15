-- AlterTable
ALTER TABLE "community_posts" ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "community_posts_is_deleted_created_at_idx" ON "community_posts"("is_deleted", "created_at");
