-- CreateTable
CREATE TABLE "skill_edges" (
    "id" TEXT NOT NULL,
    "from_skill_id" TEXT NOT NULL,
    "to_skill_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'leads_to',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_edges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_skill_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "evidence" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_skill_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "skill_edges_to_skill_id_idx" ON "skill_edges"("to_skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "skill_edges_from_skill_id_to_skill_id_key" ON "skill_edges"("from_skill_id", "to_skill_id");

-- CreateIndex
CREATE INDEX "user_skill_progress_skill_id_idx" ON "user_skill_progress"("skill_id");

-- CreateIndex
CREATE INDEX "user_skill_progress_user_id_status_idx" ON "user_skill_progress"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "user_skill_progress_user_id_skill_id_key" ON "user_skill_progress"("user_id", "skill_id");

-- AddForeignKey
ALTER TABLE "skill_edges" ADD CONSTRAINT "skill_edges_from_skill_id_fkey" FOREIGN KEY ("from_skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_edges" ADD CONSTRAINT "skill_edges_to_skill_id_fkey" FOREIGN KEY ("to_skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_skill_progress" ADD CONSTRAINT "user_skill_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_skill_progress" ADD CONSTRAINT "user_skill_progress_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
