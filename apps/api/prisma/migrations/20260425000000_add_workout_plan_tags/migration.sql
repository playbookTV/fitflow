-- AlterTable
ALTER TABLE "workout_plans" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
