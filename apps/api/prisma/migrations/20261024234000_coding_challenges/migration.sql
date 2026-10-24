-- CreateTable
CREATE TABLE "challenges" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'javascript',
    "function_name" TEXT NOT NULL,
    "starter_code" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "examples" JSONB NOT NULL,
    "tests" JSONB NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_submissions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "challenge_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "tests_passed" INTEGER NOT NULL,
    "tests_total" INTEGER NOT NULL,
    "runtime_error" TEXT,
    "results" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenge_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_solves" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "challenge_id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "base_points" INTEGER NOT NULL,
    "rank_bonus" INTEGER NOT NULL,
    "points_awarded" INTEGER NOT NULL,
    "solved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenge_solves_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "challenges_slug_key" ON "challenges"("slug");

-- CreateIndex
CREATE INDEX "challenges_published_sort_order_idx" ON "challenges"("published", "sort_order");

-- CreateIndex
CREATE INDEX "challenge_submissions_user_id_challenge_id_created_at_idx" ON "challenge_submissions"("user_id", "challenge_id", "created_at");

-- CreateIndex
CREATE INDEX "challenge_submissions_challenge_id_created_at_idx" ON "challenge_submissions"("challenge_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_solves_submission_id_key" ON "challenge_solves"("submission_id");

-- CreateIndex
CREATE INDEX "challenge_solves_challenge_id_rank_idx" ON "challenge_solves"("challenge_id", "rank");

-- CreateIndex
CREATE INDEX "challenge_solves_user_id_idx" ON "challenge_solves"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_solves_user_id_challenge_id_key" ON "challenge_solves"("user_id", "challenge_id");

-- AddForeignKey
ALTER TABLE "challenge_submissions" ADD CONSTRAINT "challenge_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_submissions" ADD CONSTRAINT "challenge_submissions_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_solves" ADD CONSTRAINT "challenge_solves_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_solves" ADD CONSTRAINT "challenge_solves_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_solves" ADD CONSTRAINT "challenge_solves_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "challenge_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
