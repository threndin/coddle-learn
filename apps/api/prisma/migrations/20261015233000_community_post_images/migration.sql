-- AlterTable
ALTER TABLE "community_posts" ADD COLUMN     "related_title" TEXT,
ADD COLUMN     "image_urls" TEXT[] DEFAULT ARRAY[]::TEXT[];
