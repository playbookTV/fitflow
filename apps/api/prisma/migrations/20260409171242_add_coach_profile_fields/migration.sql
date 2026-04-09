-- AlterTable
ALTER TABLE "coaches" ADD COLUMN     "business_name" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Africa/Lagos';
