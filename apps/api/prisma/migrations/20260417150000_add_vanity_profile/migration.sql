-- AlterTable: Add public profile fields to coaches
ALTER TABLE "coaches" ADD COLUMN "bio" TEXT;
ALTER TABLE "coaches" ADD COLUMN "avatar_url" TEXT;
ALTER TABLE "coaches" ADD COLUMN "profile_visible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "coaches" ADD COLUMN "show_rates_publicly" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "coaches" ADD COLUMN "show_whatsapp" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "coaches" ADD COLUMN "show_telegram" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "coaches" ADD COLUMN "default_price_per_session" INTEGER;
ALTER TABLE "coaches" ADD COLUMN "default_sessions_per_block" INTEGER;
ALTER TABLE "coaches" ADD COLUMN "default_monthly_rate" INTEGER;

-- CreateTable: slug_redirects
CREATE TABLE "slug_redirects" (
    "id" TEXT NOT NULL,
    "old_slug" TEXT NOT NULL,
    "new_slug" TEXT NOT NULL,
    "coach_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slug_redirects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "slug_redirects_old_slug_key" ON "slug_redirects"("old_slug");

-- CreateTable: profile_events
CREATE TABLE "profile_events" (
    "id" TEXT NOT NULL,
    "coach_slug" TEXT NOT NULL,
    "coach_id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "channel" TEXT,
    "source" TEXT,
    "ip_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "profile_events_coach_id_idx" ON "profile_events"("coach_id");
CREATE INDEX "profile_events_coach_slug_idx" ON "profile_events"("coach_slug");
CREATE INDEX "profile_events_event_idx" ON "profile_events"("event");
