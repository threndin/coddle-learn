-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "coddle_user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "bio" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_coddle_user_id_key" ON "users"("coddle_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
