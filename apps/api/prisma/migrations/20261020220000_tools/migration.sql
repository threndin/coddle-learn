-- CreateTable
CREATE TABLE "tools" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "pricing" TEXT NOT NULL,
    "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'pending',
    "submitted_by_user_id" TEXT,
    "review_note" TEXT,
    "published_at" TIMESTAMP(3),
    "sort_order" INTEGER NOT NULL DEFAULT 100,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_skills" (
    "tool_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_skills_pkey" PRIMARY KEY ("tool_id","skill_id")
);

-- CreateTable
CREATE TABLE "user_tool_bookmarks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tool_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_tool_bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tools_slug_key" ON "tools"("slug");
CREATE UNIQUE INDEX "tools_url_key" ON "tools"("url");
CREATE INDEX "tools_status_published_at_idx" ON "tools"("status", "published_at");
CREATE INDEX "tools_submitted_by_user_id_created_at_idx" ON "tools"("submitted_by_user_id", "created_at");
CREATE INDEX "tools_category_idx" ON "tools"("category");
CREATE INDEX "tools_sort_order_idx" ON "tools"("sort_order");
CREATE INDEX "tool_skills_skill_id_idx" ON "tool_skills"("skill_id");
CREATE UNIQUE INDEX "user_tool_bookmarks_user_id_tool_id_key" ON "user_tool_bookmarks"("user_id", "tool_id");
CREATE INDEX "user_tool_bookmarks_tool_id_idx" ON "user_tool_bookmarks"("tool_id");

-- AddForeignKey
ALTER TABLE "tools" ADD CONSTRAINT "tools_submitted_by_user_id_fkey" FOREIGN KEY ("submitted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tool_skills" ADD CONSTRAINT "tool_skills_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tool_skills" ADD CONSTRAINT "tool_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_tool_bookmarks" ADD CONSTRAINT "user_tool_bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_tool_bookmarks" ADD CONSTRAINT "user_tool_bookmarks_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
