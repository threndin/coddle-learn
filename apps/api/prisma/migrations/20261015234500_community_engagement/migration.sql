-- AlterTable
ALTER TABLE "community_posts" ADD COLUMN     "impression_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "comment_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "community_post_impressions" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_post_impressions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_post_reactions" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_post_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "community_post_impressions_user_id_idx" ON "community_post_impressions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_post_impressions_post_id_user_id_key" ON "community_post_impressions"("post_id", "user_id");

-- CreateIndex
CREATE INDEX "community_post_reactions_post_id_emoji_idx" ON "community_post_reactions"("post_id", "emoji");

-- CreateIndex
CREATE INDEX "community_post_reactions_user_id_idx" ON "community_post_reactions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_post_reactions_post_id_user_id_key" ON "community_post_reactions"("post_id", "user_id");

-- AddForeignKey
ALTER TABLE "community_post_impressions" ADD CONSTRAINT "community_post_impressions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_impressions" ADD CONSTRAINT "community_post_impressions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_reactions" ADD CONSTRAINT "community_post_reactions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_reactions" ADD CONSTRAINT "community_post_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
