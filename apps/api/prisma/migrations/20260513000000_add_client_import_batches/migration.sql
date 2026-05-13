-- CreateEnum
CREATE TYPE "ImportSource" AS ENUM ('CSV', 'PASTE', 'MANUAL');

-- CreateEnum
CREATE TYPE "ImportBatchStatus" AS ENUM ('DRAFT', 'VALIDATED', 'COMMITTED', 'PARTIALLY_COMMITTED', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportClientType" AS ENUM ('NEW_LEAD', 'EXISTING_SKIP_INTAKE', 'EXISTING_REQUEST_FRESH_INTAKE');

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "import_batch_id" TEXT,
ADD COLUMN     "import_client_type" "ImportClientType",
ADD COLUMN     "imported_at" TIMESTAMP(3),
ADD COLUMN     "pre_existing" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "client_import_batches" (
    "id" TEXT NOT NULL,
    "coach_id" TEXT NOT NULL,
    "source" "ImportSource" NOT NULL,
    "row_count" INTEGER NOT NULL,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "handoff_template" TEXT,
    "handoff_channel_default" "MessageChannel",
    "handoff_interval_ms" INTEGER,
    "idempotency_key" TEXT,
    "status" "ImportBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "committed_at" TIMESTAMP(3),

    CONSTRAINT "client_import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_import_batches_idempotency_key_key" ON "client_import_batches"("idempotency_key");

-- CreateIndex
CREATE INDEX "client_import_batches_coach_id_idx" ON "client_import_batches"("coach_id");

-- CreateIndex
CREATE INDEX "clients_coach_id_phone_idx" ON "clients"("coach_id", "phone");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_import_batch_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "client_import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
