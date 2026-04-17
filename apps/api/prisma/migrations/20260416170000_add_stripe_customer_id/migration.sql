-- Add stripe_customer_id to coaches table
ALTER TABLE "coaches" ADD COLUMN "stripe_customer_id" TEXT;
CREATE UNIQUE INDEX "coaches_stripe_customer_id_key" ON "coaches"("stripe_customer_id");
