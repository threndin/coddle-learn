-- CreateTable
CREATE TABLE "course_exercises" (
    "id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL DEFAULT '',
    "hint" TEXT NOT NULL DEFAULT '',
    "solution" TEXT NOT NULL DEFAULT '',
    "config" JSONB NOT NULL DEFAULT '{}',
    "estimated_minutes" INTEGER NOT NULL DEFAULT 15,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_exercise_submissions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "response" JSONB NOT NULL DEFAULT '{}',
    "score" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "points_awarded" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_exercise_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "course_exercises_lesson_id_sort_order_idx" ON "course_exercises"("lesson_id", "sort_order");

-- CreateIndex
CREATE INDEX "user_exercise_submissions_exercise_id_idx" ON "user_exercise_submissions"("exercise_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_exercise_submissions_user_id_exercise_id_key" ON "user_exercise_submissions"("user_id", "exercise_id");

-- AddForeignKey
ALTER TABLE "course_exercises" ADD CONSTRAINT "course_exercises_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "course_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_exercise_submissions" ADD CONSTRAINT "user_exercise_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_exercise_submissions" ADD CONSTRAINT "user_exercise_submissions_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "course_exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
