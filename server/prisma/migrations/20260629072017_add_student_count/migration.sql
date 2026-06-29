-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ScheduleStatus" ADD VALUE 'PENDING';
ALTER TYPE "ScheduleStatus" ADD VALUE 'SCHEDULED';

-- AlterTable
ALTER TABLE "Schedule" ADD COLUMN     "studentCount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "status" SET DEFAULT 'PENDING';
