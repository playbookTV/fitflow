-- Add intake_token column to clients table
ALTER TABLE "clients" ADD COLUMN "intake_token" TEXT;
CREATE UNIQUE INDEX "clients_intake_token_key" ON "clients"("intake_token");

-- Enforce at most one active plan assignment per client
CREATE UNIQUE INDEX "plan_assignments_client_active_unique"
  ON "plan_assignments" ("client_id")
  WHERE "is_active" = true;

-- Enforce at most one active meal assignment per client
CREATE UNIQUE INDEX "meal_assignments_client_active_unique"
  ON "meal_assignments" ("client_id")
  WHERE "is_active" = true;

