-- CreateTable
CREATE TABLE "user_point_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "ref_type" TEXT,
    "ref_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_point_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_point_events_user_id_created_at_idx" ON "user_point_events"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "user_point_events_reason_created_at_idx" ON "user_point_events"("reason", "created_at");

-- CreateIndex
CREATE INDEX "user_point_events_ref_type_ref_id_idx" ON "user_point_events"("ref_type", "ref_id");

-- AddForeignKey
ALTER TABLE "user_point_events" ADD CONSTRAINT "user_point_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
