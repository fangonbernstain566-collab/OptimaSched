-- AlterTable
ALTER TABLE "Schedule"
ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Index to speed up active/recently-deleted queries
CREATE INDEX "Schedule_isDeleted_deletedAt_idx" ON "Schedule"("isDeleted", "deletedAt");
