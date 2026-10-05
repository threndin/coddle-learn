-- CreateTable
CREATE TABLE "roadmaps" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "weeks" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roadmaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap_steps" (
    "id" TEXT NOT NULL,
    "roadmap_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "estimated_minutes" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "resources" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roadmap_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roadmaps" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "roadmap_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "user_roadmaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_step_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "step_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_step_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roadmaps_slug_key" ON "roadmaps"("slug");

-- CreateIndex
CREATE INDEX "roadmap_steps_roadmap_id_sort_order_idx" ON "roadmap_steps"("roadmap_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "roadmap_steps_roadmap_id_slug_key" ON "roadmap_steps"("roadmap_id", "slug");

-- CreateIndex
CREATE INDEX "user_roadmaps_roadmap_id_idx" ON "user_roadmaps"("roadmap_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roadmaps_user_id_roadmap_id_key" ON "user_roadmaps"("user_id", "roadmap_id");

-- CreateIndex
CREATE INDEX "user_step_progress_step_id_idx" ON "user_step_progress"("step_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_step_progress_user_id_step_id_key" ON "user_step_progress"("user_id", "step_id");

-- AddForeignKey
ALTER TABLE "roadmap_steps" ADD CONSTRAINT "roadmap_steps_roadmap_id_fkey" FOREIGN KEY ("roadmap_id") REFERENCES "roadmaps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roadmaps" ADD CONSTRAINT "user_roadmaps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roadmaps" ADD CONSTRAINT "user_roadmaps_roadmap_id_fkey" FOREIGN KEY ("roadmap_id") REFERENCES "roadmaps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_step_progress" ADD CONSTRAINT "user_step_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_step_progress" ADD CONSTRAINT "user_step_progress_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "roadmap_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
