-- AlterTable
ALTER TABLE "Schedule" ADD COLUMN     "enrolledStudents" TEXT[] DEFAULT ARRAY[]::TEXT[];
