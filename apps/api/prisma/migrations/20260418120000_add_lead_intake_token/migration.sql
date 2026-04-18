-- Add intake_token column to leads table
ALTER TABLE "leads" ADD COLUMN "intake_token" TEXT;
CREATE UNIQUE INDEX "leads_intake_token_key" ON "leads"("intake_token");
