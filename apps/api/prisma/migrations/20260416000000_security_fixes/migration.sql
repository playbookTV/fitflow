-- Add intake_token column to clients table
ALTER TABLE "clients" ADD COLUMN "intake_token" TEXT;
CREATE UNIQUE INDEX "clients_intake_token_key" ON "clients"("intake_token");

-- Enforce at most one active plan assignment per client
CREATE UNIQUE INDEX "plan_assignments_client_active_unique"
  ON "plan_assignments" ("client_id")
  WHERE "is_active" = true;

-- Enforce at most one active meal assignment per client (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meal_assignments') THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "meal_assignments_client_active_unique"
      ON "meal_assignments" ("client_id")
      WHERE "is_active" = true;
  END IF;
END $$;

