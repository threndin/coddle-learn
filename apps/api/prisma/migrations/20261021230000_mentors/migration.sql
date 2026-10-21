-- CreateTable
CREATE TABLE "mentor_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "about" TEXT NOT NULL DEFAULT '',
    "experience_years" INTEGER,
    "availability" TEXT NOT NULL,
    "timezone" TEXT,
    "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mentor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentor_profile_skills" (
    "mentor_profile_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mentor_profile_skills_pkey" PRIMARY KEY ("mentor_profile_id","skill_id")
);

-- CreateTable
CREATE TABLE "mentorship_programs" (
    "id" TEXT NOT NULL,
    "mentor_profile_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "kind" TEXT NOT NULL,
    "capacity" INTEGER,
    "duration_weeks" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mentorship_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentorship_applications" (
    "id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "mentee_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "goals" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "mentor_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "reviewed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "mentorship_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mentor_profiles_user_id_key" ON "mentor_profiles"("user_id");

-- CreateIndex
CREATE INDEX "mentor_profiles_availability_created_at_idx" ON "mentor_profiles"("availability", "created_at");

-- CreateIndex
CREATE INDEX "mentor_profile_skills_skill_id_idx" ON "mentor_profile_skills"("skill_id");

-- CreateIndex
CREATE INDEX "mentorship_programs_mentor_profile_id_status_idx" ON "mentorship_programs"("mentor_profile_id", "status");

-- CreateIndex
CREATE INDEX "mentorship_programs_kind_status_idx" ON "mentorship_programs"("kind", "status");

-- CreateIndex
CREATE UNIQUE INDEX "mentorship_programs_mentor_profile_id_slug_key" ON "mentorship_programs"("mentor_profile_id", "slug");

-- CreateIndex
CREATE INDEX "mentorship_applications_mentee_id_status_created_at_idx" ON "mentorship_applications"("mentee_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "mentorship_applications_program_id_status_idx" ON "mentorship_applications"("program_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "mentorship_applications_program_id_mentee_id_key" ON "mentorship_applications"("program_id", "mentee_id");

-- AddForeignKey
ALTER TABLE "mentor_profiles" ADD CONSTRAINT "mentor_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_profile_skills" ADD CONSTRAINT "mentor_profile_skills_mentor_profile_id_fkey" FOREIGN KEY ("mentor_profile_id") REFERENCES "mentor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_profile_skills" ADD CONSTRAINT "mentor_profile_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentorship_programs" ADD CONSTRAINT "mentorship_programs_mentor_profile_id_fkey" FOREIGN KEY ("mentor_profile_id") REFERENCES "mentor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentorship_applications" ADD CONSTRAINT "mentorship_applications_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "mentorship_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentorship_applications" ADD CONSTRAINT "mentorship_applications_mentee_id_fkey" FOREIGN KEY ("mentee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
