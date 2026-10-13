-- CreateTable
CREATE TABLE "user_achievements" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "earned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_achievements_user_id_earned_at_idx" ON "user_achievements"("user_id", "earned_at");

-- CreateIndex
CREATE INDEX "user_achievements_slug_idx" ON "user_achievements"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "user_achievements_user_id_slug_key" ON "user_achievements"("user_id", "slug");

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
