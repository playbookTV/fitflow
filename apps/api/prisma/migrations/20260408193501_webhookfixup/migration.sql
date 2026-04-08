/*
  Warnings:

  - You are about to drop the column `trainer_id` on the `clients` table. All the data in the column will be lost.
  - You are about to drop the column `owner_trainer_id` on the `workout_plans` table. All the data in the column will be lost.
  - You are about to drop the column `trainer_id` on the `workout_plans` table. All the data in the column will be lost.
  - You are about to drop the `trainers` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[telegram_chat_id]` on the table `clients` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[ymove_id]` on the table `exercises` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `coach_id` to the `clients` table without a default value. This is not possible if the table is not empty.
  - Added the required column `coach_id` to the `workout_plans` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('WHATSAPP', 'TELEGRAM');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('STRIPE', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'INTAKE_COMPLETE', 'PAYMENT_PENDING', 'CONVERTED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "clients" DROP CONSTRAINT "clients_trainer_id_fkey";

-- DropForeignKey
ALTER TABLE "workout_plans" DROP CONSTRAINT "workout_plans_owner_trainer_id_fkey";

-- DropForeignKey
ALTER TABLE "workout_plans" DROP CONSTRAINT "workout_plans_trainer_id_fkey";

-- AlterTable
ALTER TABLE "clients" DROP COLUMN "trainer_id",
ADD COLUMN     "coach_id" TEXT NOT NULL,
ADD COLUMN     "preferred_channel" "MessageChannel" NOT NULL DEFAULT 'WHATSAPP',
ADD COLUMN     "telegram_chat_id" TEXT,
ALTER COLUMN "phone" DROP NOT NULL;

-- AlterTable
ALTER TABLE "exercises" ADD COLUMN     "ymove_id" TEXT;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "confirmed_by" TEXT,
ADD COLUMN     "payment_method" "PaymentMethod" NOT NULL DEFAULT 'STRIPE',
ALTER COLUMN "stripe_session_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "workout_plans" DROP COLUMN "owner_trainer_id",
DROP COLUMN "trainer_id",
ADD COLUMN     "coach_id" TEXT NOT NULL,
ADD COLUMN     "owner_coach_id" TEXT;

-- DropTable
DROP TABLE "trainers";

-- CreateTable
CREATE TABLE "coaches" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "slug" TEXT,
    "stripe_account_id" TEXT,
    "default_channel" "MessageChannel",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coaches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "channel" "MessageChannel" NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "content" TEXT NOT NULL,
    "meta_message_id" TEXT,
    "status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "coach_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "channel_param" "MessageChannel",
    "source_tags" TEXT[],
    "cta_type" TEXT,
    "payment_route" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "coach_id" TEXT NOT NULL,
    "offer_id" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "telegram_chat_id" TEXT,
    "channel_tag" "MessageChannel" NOT NULL,
    "source" TEXT,
    "intake_data" JSONB,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bot_registry" (
    "id" TEXT NOT NULL,
    "coach_id" TEXT NOT NULL,
    "bot_token" TEXT NOT NULL,
    "bot_username" TEXT NOT NULL,
    "webhook_url" TEXT NOT NULL,
    "webhook_secret" TEXT,
    "provisioned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bot_registry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_logs" (
    "id" TEXT NOT NULL,
    "coach_id" TEXT,
    "client_id" TEXT,
    "event_type" TEXT NOT NULL,
    "channel" "MessageChannel",
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coaches_email_key" ON "coaches"("email");

-- CreateIndex
CREATE UNIQUE INDEX "coaches_slug_key" ON "coaches"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "messages_meta_message_id_key" ON "messages"("meta_message_id");

-- CreateIndex
CREATE UNIQUE INDEX "offers_coach_id_slug_key" ON "offers"("coach_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "bot_registry_coach_id_key" ON "bot_registry"("coach_id");

-- CreateIndex
CREATE INDEX "event_logs_coach_id_idx" ON "event_logs"("coach_id");

-- CreateIndex
CREATE INDEX "event_logs_client_id_idx" ON "event_logs"("client_id");

-- CreateIndex
CREATE INDEX "event_logs_event_type_idx" ON "event_logs"("event_type");

-- CreateIndex
CREATE UNIQUE INDEX "clients_telegram_chat_id_key" ON "clients"("telegram_chat_id");

-- CreateIndex
CREATE UNIQUE INDEX "exercises_ymove_id_key" ON "exercises"("ymove_id");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "coaches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_plans" ADD CONSTRAINT "workout_plans_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "coaches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_plans" ADD CONSTRAINT "workout_plans_owner_coach_id_fkey" FOREIGN KEY ("owner_coach_id") REFERENCES "coaches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "coaches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "coaches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_registry" ADD CONSTRAINT "bot_registry_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "coaches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
