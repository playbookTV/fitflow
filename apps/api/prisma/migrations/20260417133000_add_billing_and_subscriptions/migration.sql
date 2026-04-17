-- Add billing_currency column to coaches table
ALTER TABLE "coaches" ADD COLUMN "billing_currency" TEXT NOT NULL DEFAULT 'usd';

-- Create subscription-related enums
CREATE TYPE "SubscriptionTier" AS ENUM ('STARTER', 'PRO', 'STUDIO');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'INCOMPLETE');
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'ANNUAL');

-- Create subscriptions table
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "coach_id" TEXT NOT NULL,
    "stripe_subscription_id" TEXT NOT NULL,
    "stripe_price_id" TEXT NOT NULL,
    "tier" "SubscriptionTier" NOT NULL DEFAULT 'STARTER',
    "billing_interval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "trial_end" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes
CREATE UNIQUE INDEX "subscriptions_coach_id_key" ON "subscriptions"("coach_id");
CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");

-- Add foreign key
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "coaches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
