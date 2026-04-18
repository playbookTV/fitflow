-- Add conversation management fields to clients
ALTER TABLE "clients" ADD COLUMN "conversation_pinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "clients" ADD COLUMN "conversation_archived" BOOLEAN NOT NULL DEFAULT false;
