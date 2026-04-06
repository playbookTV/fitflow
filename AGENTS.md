# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

FitFlow is a coaching operations platform for online personal trainers. It enables coaches to manage clients, deliver workout plans, collect check-ins, and process payments — delivered through WhatsApp or Telegram, without asking clients to download another app.

## Development Commands

```bash
# Install dependencies (from repo root)
pnpm install

# Run all apps in development (uses Turborepo)
pnpm turbo dev

# Run individual apps
pnpm --filter @fitflow/web dev      # Next.js web app on :3000
pnpm --filter @fitflow/api dev      # Express API on :3001

# Build & type-check
pnpm turbo build
pnpm turbo type-check
pnpm turbo lint

# Database (from apps/api)
pnpm --filter @fitflow/api prisma:generate   # Generate Prisma client
pnpm --filter @fitflow/api prisma:migrate    # Run migrations
pnpm --filter @fitflow/api prisma:studio     # Open Prisma Studio

# Start BullMQ worker separately (for background jobs)
pnpm --filter @fitflow/api worker:start
```

## Architecture

### Monorepo Structure
- `apps/web` — Next.js 14 coach dashboard (Supabase auth, Tailwind, Radix UI)
- `apps/api` — Express.js API (Prisma ORM, BullMQ workers, WhatsApp/Stripe integration)
- `packages/shared` — Shared types, channel abstraction interfaces, and Zod schemas

### Key Integration Flows
1. **WhatsApp Messaging**: Meta Cloud API (direct) → webhook processor → BullMQ queue → workout delivery
2. **Telegram Messaging**: Per-coach Telegram Bot API → webhook per coach → BullMQ queue → workout delivery
3. **Channel Abstraction**: `DeliveryChannel` interface in `packages/shared` with WhatsApp and Telegram adapters
4. **Payments**: Stripe Connect (coaches are merchants) → payment webhooks → client status update. Bank transfer supported as manual fallback.
5. **Scheduling**: BullMQ job queues with timezone-aware cron for workout delivery and check-in reminders

### Data Model (Prisma)
Core entities: `Coach` → `Client` → `PlanAssignment` → `WorkoutPlan` → `WorkoutDay` → `WorkoutExercise`
Client progress: `CheckIn` (weekly weight/energy/sleep), `WorkoutLog` (completion status)
Billing: `Payment` with Stripe session tracking and bank transfer support
Audit: `EventLog` for key state transitions
Channels: `MessageChannel` enum (`WHATSAPP` | `TELEGRAM`), client has `preferredChannel`

### Client Status Flow
`PENDING_PAYMENT` → `INTAKE_SENT` → `INTAKE_COMPLETE` → `PLAN_ASSIGNED` → `ACTIVE` → `PAUSED`/`INACTIVE`

## Environment Setup

Copy `.env.example` to `.env` (API) or `.env.local` (web) in each app directory.

Required services:
- Supabase (database + auth + storage)
- Redis (BullMQ job queue)
- Meta Cloud API (WhatsApp Business API)
- Stripe Connect (payments)

## Development Guidelines

### Superpowers Rules (from .agent/rules)
- For non-trivial changes: brainstorm → plan → get approval → implement
- Verification is mandatory after implementation (tests, lint, manual verification)
- Prefer TDD / regression tests when fixing bugs
- Artifacts (plans, reviews) go to `artifacts/superpowers/`

### Frontend
- Mobile-first PWA design (coaches operate 80% on phone)
- Use Radix UI primitives with Tailwind styling
- Recharts for progress dashboards

### API
- All routes authenticated via Supabase middleware
- WhatsApp webhook processing must be idempotent (dead letter queue for failed messages)
- Timezone-aware scheduling using `date-fns-tz`
- Instagram integration permanently removed (PRD v2 decision)
- Terminology: "Coach" (not "Trainer") throughout codebase
