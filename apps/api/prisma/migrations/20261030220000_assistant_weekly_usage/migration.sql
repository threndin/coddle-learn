-- CreateTable
CREATE TABLE "assistant_weekly_usage" (
    "user_id" TEXT NOT NULL,
    "week_start" TIMESTAMP(3) NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "assistant_weekly_usage_pkey" PRIMARY KEY ("user_id","week_start")
);

-- AddForeignKey
ALTER TABLE "assistant_weekly_usage" ADD CONSTRAINT "assistant_weekly_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
