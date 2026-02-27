# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FitFlow is a WhatsApp-native trainer CRM for personal fitness coaches. It enables trainers to manage clients, deliver workout plans, collect check-ins, and process payments — all through WhatsApp as the client interface.

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
- `apps/web` — Next.js 14 trainer dashboard (Supabase auth, Tailwind, Radix UI)
- `apps/api` — Express.js API (Prisma ORM, BullMQ workers, Meta/Stripe integration)
- `packages/shared` — Shared types and Zod schemas

### Key Integration Flows
1. **WhatsApp Messaging**: Meta Cloud API (direct) → webhook processor → BullMQ queue → workout delivery
2. **Payments**: Stripe Connect (trainers are merchants) → payment webhooks → client status update
3. **Scheduling**: BullMQ job queues with timezone-aware cron for workout delivery and check-in reminders

### Data Model (Prisma)
Core entities: `Trainer` → `Client` → `PlanAssignment` → `WorkoutPlan` → `WorkoutDay` → `WorkoutExercise`
Client progress: `CheckIn` (weekly weight/energy/sleep), `WorkoutLog` (completion status)
Billing: `Payment` with Stripe session tracking

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
