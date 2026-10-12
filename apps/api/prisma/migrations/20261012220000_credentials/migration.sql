-- CreateTable
CREATE TABLE "credentials" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "assessment_id" TEXT,
    "assessment_attempt_id" TEXT,
    "project_id" TEXT,
    "project_submission_id" TEXT,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "credentials_code_key" ON "credentials"("code");

-- CreateIndex
CREATE INDEX "credentials_user_id_issued_at_idx" ON "credentials"("user_id", "issued_at");

-- CreateIndex
CREATE INDEX "credentials_kind_idx" ON "credentials"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "credentials_user_id_assessment_id_key" ON "credentials"("user_id", "assessment_id");

-- CreateIndex
CREATE UNIQUE INDEX "credentials_user_id_project_id_key" ON "credentials"("user_id", "project_id");

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_assessment_attempt_id_fkey" FOREIGN KEY ("assessment_attempt_id") REFERENCES "assessment_attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_project_submission_id_fkey" FOREIGN KEY ("project_submission_id") REFERENCES "project_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
