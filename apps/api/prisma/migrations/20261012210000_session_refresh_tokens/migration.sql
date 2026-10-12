-- Existing sessions cannot be refreshed; clear them so the new column can be NOT NULL.
DELETE FROM "sessions";

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN "refresh_token_hash" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refresh_token_hash_key" ON "sessions"("refresh_token_hash");
