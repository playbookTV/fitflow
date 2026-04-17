-- CreateEnum
CREATE TYPE "PaymentModel" AS ENUM ('SESSION_BLOCKS', 'PER_SESSION', 'MONTHLY_RETAINER');

-- AlterTable: Add onboarding fields to coaches
ALTER TABLE "coaches" ADD COLUMN "specialities" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "coaches" ADD COLUMN "default_payment_model" "PaymentModel";
ALTER TABLE "coaches" ADD COLUMN "active_client_range" TEXT;
ALTER TABLE "coaches" ADD COLUMN "onboarding_completed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "coaches" ADD COLUMN "onboarding_step" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: Add monthly_rate to clients
ALTER TABLE "clients" ADD COLUMN "monthly_rate" INTEGER;

-- CreateTable: session_blocks
CREATE TABLE "session_blocks" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "total_sessions" INTEGER NOT NULL,
    "used_sessions" INTEGER NOT NULL DEFAULT 0,
    "price_per_session" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_blocks_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "session_blocks" ADD CONSTRAINT "session_blocks_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
