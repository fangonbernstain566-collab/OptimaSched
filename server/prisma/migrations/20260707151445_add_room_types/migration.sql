-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RoomType" ADD VALUE 'OFFICE';
ALTER TYPE "RoomType" ADD VALUE 'CLINIC';
ALTER TYPE "RoomType" ADD VALUE 'LIBRARY';
ALTER TYPE "RoomType" ADD VALUE 'AVR';
ALTER TYPE "RoomType" ADD VALUE 'SIMULATOR_ROOM';
ALTER TYPE "RoomType" ADD VALUE 'FACULTY_ROOM';
ALTER TYPE "RoomType" ADD VALUE 'UNAVAILABLE';
