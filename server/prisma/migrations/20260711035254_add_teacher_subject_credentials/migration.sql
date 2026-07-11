-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "credentials" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Subject" ADD COLUMN     "requiredCredentials" TEXT[] DEFAULT ARRAY[]::TEXT[];
