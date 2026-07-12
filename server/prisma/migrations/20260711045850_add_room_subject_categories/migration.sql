-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "allowedCategories" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Subject" ADD COLUMN     "requiredRoomCategories" TEXT[] DEFAULT ARRAY[]::TEXT[];
