-- Rename old payload column to new generic metadata column
ALTER TABLE "AuditLog" RENAME COLUMN "details" TO "metadata";

-- Allow audit logs to survive user deletion
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_userId_fkey";
ALTER TABLE "AuditLog" ALTER COLUMN "userId" DROP NOT NULL;

-- Add normalized audit columns for querying/reporting
ALTER TABLE "AuditLog"
ADD COLUMN "userName" TEXT,
ADD COLUMN "userRole" TEXT,
ADD COLUMN "module" TEXT NOT NULL DEFAULT 'SYSTEM',
ADD COLUMN "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN "targetRecordId" TEXT,
ADD COLUMN "targetRecordName" TEXT,
ADD COLUMN "ipAddress" TEXT,
ADD COLUMN "userAgent" TEXT;

-- metadata should be optional going forward
ALTER TABLE "AuditLog" ALTER COLUMN "metadata" DROP NOT NULL;

-- Backfill new fields from existing records
UPDATE "AuditLog" AS al
SET
  "description" = CASE
    WHEN al."description" = '' THEN al."action"
    ELSE al."description"
  END,
  "ipAddress" = COALESCE(al."ipAddress", al."metadata"->>'ip'),
  "userAgent" = COALESCE(al."userAgent", al."metadata"->>'origin'),
  "targetRecordId" = COALESCE(al."targetRecordId", al."metadata"->>'entityId'),
  "targetRecordName" = COALESCE(al."targetRecordName", al."metadata"->>'entityName'),
  "module" = COALESCE(NULLIF(al."metadata"->>'module', ''), NULLIF(al."metadata"->>'entityType', ''), al."module");

-- Backfill denormalized user fields
UPDATE "AuditLog" AS al
SET
  "userName" = CONCAT(u."firstName", ' ', u."lastName"),
  "userRole" = r."name"::TEXT
FROM "User" AS u
JOIN "Role" AS r ON r."id" = u."roleId"
WHERE al."userId" = u."id";

-- Recreate FK with onDelete SetNull
ALTER TABLE "AuditLog"
ADD CONSTRAINT "AuditLog_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Add indexes for pagination/filtering workloads
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");
CREATE INDEX "AuditLog_module_createdAt_idx" ON "AuditLog"("module", "createdAt");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
CREATE INDEX "AuditLog_userRole_createdAt_idx" ON "AuditLog"("userRole", "createdAt");
CREATE INDEX "AuditLog_targetRecordId_idx" ON "AuditLog"("targetRecordId");
