-- CreateTable
CREATE TABLE "community_reports" (
    "id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "post_id" TEXT,
    "comment_id" TEXT,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "community_reports_status_created_at_idx" ON "community_reports"("status", "created_at");

-- CreateIndex
CREATE INDEX "community_reports_post_id_idx" ON "community_reports"("post_id");

-- CreateIndex
CREATE INDEX "community_reports_comment_id_idx" ON "community_reports"("comment_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_reports_reporter_id_post_id_key" ON "community_reports"("reporter_id", "post_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_reports_reporter_id_comment_id_key" ON "community_reports"("reporter_id", "comment_id");

-- AddForeignKey
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "community_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
