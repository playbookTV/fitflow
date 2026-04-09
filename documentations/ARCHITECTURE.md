# FitFlow Architecture Documentation

> Last updated: April 9, 2026

FitFlow is a coaching operations platform for online personal trainers. Coaches manage clients, deliver workout plans, collect check-ins, and process payments — all through WhatsApp or Telegram, without asking clients to download another app.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Monorepo Structure](#monorepo-structure)
3. [Technology Stack](#technology-stack)
4. [Data Model](#data-model)
5. [Key Architectural Patterns](#key-architectural-patterns)
6. [Integration Architecture](#integration-architecture)
7. [Background Job System](#background-job-system)
8. [Authentication & Authorization](#authentication--authorization)
9. [Frontend Architecture](#frontend-architecture)
10. [Key Architectural Decisions](#key-architectural-decisions)
11. [Data Flows](#data-flows)
12. [Deployment Architecture](#deployment-architecture)

---

## System Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌───────────────────┐
│   Coach Dashboard│     │   Express API     │     │   Background      │
│   (Next.js 14)  │────▶│   + Prisma ORM    │────▶│   Workers (BullMQ)│
│   Vercel        │     │   Railway         │     │   Redis-backed    │
└─────────────────┘     └────────┬──────────┘     └───────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
             ┌───────────┐ ┌─────────┐ ┌──────────┐
             │ Supabase   │ │ Stripe  │ │ Messaging│
             │ (Postgres  │ │ Connect │ │ Channels │
             │  + Auth)   │ │         │ │ WA / TG  │
             └───────────┘ └─────────┘ └──────────┘
```

The platform is built as a **monorepo** with three workspaces:
- **`apps/web`** — Coach-facing dashboard (Next.js 14, App Router)
- **`apps/api`** — Backend API, webhook handlers, and job schedulers (Express.js)
- **`packages/shared`** — Shared TypeScript types, channel interfaces, and template definitions

---

## Monorepo Structure

```
fitflow/
├── apps/
│   ├── web/                    # Next.js 14 coach dashboard
│   │   ├── src/
│   │   │   ├── app/            # App Router pages & layouts
│   │   │   ├── components/     # React components (ui/, dashboard/)
│   │   │   └── lib/            # Supabase client, auth, utilities
│   │   └── package.json
│   │
│   └── api/                    # Express.js backend
│       ├── src/
│       │   ├── routes/         # Express route handlers
│       │   ├── middleware/     # Auth, error handling
│       │   ├── lib/            # Core libraries & adapters
│       │   │   ├── channels/   # Channel abstraction (WA/TG adapters)
│       │   │   └── templates/  # Message template system
│       │   ├── jobs/           # Cron-based schedulers
│       │   ├── workers/        # BullMQ job processors
│       │   ├── handlers/       # Command routers
│       │   ├── parser/         # Message parsing (regex + Claude NLP)
│       │   └── services/       # Business logic (YMove, exercise delivery)
│       ├── prisma/
│       │   └── schema.prisma   # Database schema
│       └── package.json
│
├── packages/
│   └── shared/                 # Shared types & interfaces
│       └── src/
│           ├── channels/       # DeliveryChannel interface
│           └── templates/      # Template types & IDs
│
├── documentations/             # Product & integration docs
├── artifacts/                  # Planning artifacts
├── turbo.json                  # Turborepo task config
├── pnpm-workspace.yaml         # Workspace definitions
└── railway.toml                # Railway deployment config
```

**Build tool:** Turborepo with pnpm workspaces  
**Node requirement:** >=20.0.0, pnpm >=9.0.0

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14 (App Router) | Coach dashboard |
| UI Components | Radix UI + Tailwind CSS | Accessible, mobile-first components |
| Charts | Recharts | Client progress dashboards |
| Backend | Express.js | REST API + webhook handlers |
| ORM | Prisma | Type-safe database access |
| Database | PostgreSQL (Supabase) | Primary data store |
| Auth | Supabase Auth | Email/password authentication |
| Job Queue | BullMQ + Redis | Background job processing |
| Payments | Stripe Connect | Coach-as-merchant payments |
| WhatsApp | Meta Cloud API | Messaging + Flows |
| Telegram | Telegram Bot API | Shared bot with coach branding |
| Exercise Videos | YMove API | On-demand exercise demo URLs |
| NLP (optional) | Claude API | Natural language command parsing |
| Deployment | Vercel (web) + Railway (API) | Hosting infrastructure |

---

## Data Model

### Core Entities

```
Coach ──┬── Client ──┬── PlanAssignment ── WorkoutPlan ── WorkoutDay ── WorkoutExercise
        │            ├── CheckIn (weekly weight/energy/sleep)
        │            ├── WorkoutLog (completion tracking)
        │            ├── Payment (Stripe + bank transfer)
        │            └── Message (conversation history)
        │
        ├── WorkoutPlan (templates)
        ├── Exercise (library, linked to YMove)
        ├── Offer ── Lead
        ├── BotRegistry (Telegram bot config)
        └── EventLog (audit trail)
```

### Client Status State Machine

```
PENDING_PAYMENT ──▶ INTAKE_SENT ──▶ INTAKE_COMPLETE ──▶ PLAN_ASSIGNED ──▶ ACTIVE ──▶ PAUSED
                                                                                  └──▶ INACTIVE
```

Each transition is triggered by a specific event:
- **PENDING_PAYMENT → INTAKE_SENT**: Stripe webhook confirms payment
- **INTAKE_SENT → INTAKE_COMPLETE**: Client submits intake form
- **INTAKE_COMPLETE → PLAN_ASSIGNED**: Coach assigns a workout plan
- **PLAN_ASSIGNED → ACTIVE**: First workout delivered
- **ACTIVE → PAUSED/INACTIVE**: Coach manual action or automated lapse detection

### Key Enums

| Enum | Values |
|------|--------|
| `MessageChannel` | `WHATSAPP`, `TELEGRAM` |
| `ClientStatus` | `PENDING_PAYMENT`, `INTAKE_SENT`, `INTAKE_COMPLETE`, `PLAN_ASSIGNED`, `ACTIVE`, `PAUSED`, `INACTIVE` |
| `PaymentStatus` | `PENDING`, `SUCCEEDED`, `FAILED` |
| `PaymentMethod` | `STRIPE`, `BANK_TRANSFER` |
| `WorkoutStatus` | `COMPLETED`, `SKIPPED`, `MODIFIED` |
| `LeadStatus` | `NEW`, `INTAKE_COMPLETE`, `PAYMENT_PENDING`, `CONVERTED`, `REJECTED` |

---

## Key Architectural Patterns

### 1. Channel Abstraction

The most significant pattern in the codebase. All messaging goes through a unified `DeliveryChannel` interface, making the business logic completely channel-agnostic.

```typescript
// packages/shared/src/channels/types.ts
interface DeliveryChannel {
  sendMessage(recipientId, content, clientId?): Promise<SendResult>
  sendStructuredCheckIn(recipientId, data): Promise<SendResult>
  sendWorkout(recipientId, data): Promise<SendResult>
  sendOnboarding(recipientId, data): Promise<SendResult>
  sendTemplate(recipientId, templateId, context, clientId?): Promise<SendResult>
  sendVideo?(recipientId, data): Promise<SendResult>
}
```

**Implementations:**
- `WhatsAppAdapter` — Uses Meta Cloud API (plain text + Flows for structured input)
- `TelegramAdapter` — Uses Telegram Bot API (MarkdownV2 + inline keyboards)

**Routing:**
- `channel-router.ts` contains a `getChannel(channel, coachId)` factory
- Workers and schedulers never know which channel — they call `channel.sendTemplate()`
- Client's `preferredChannel` field determines which adapter is used

**Why this matters:** Adding a new channel (e.g., SMS) requires only a new adapter implementation — zero changes to schedulers, workers, or business logic.

### 2. Type-Safe Template System

All outbound messages are rendered through a registry-based template system with per-channel renderers.

```typescript
// Template registration (Map-based registry)
registerTemplate({
  id: TemplateId.WORKOUT_DAILY,
  description: "Daily workout delivery",
  channels: {
    telegram: { render: (ctx: WorkoutDailyContext) => ({ text, buttons, parseMode }) },
    whatsapp: { render: (ctx: WorkoutDailyContext) => ({ text }) },
  }
})

// Usage (pure function, no side effects)
const result = renderTemplate(TemplateId.WORKOUT_DAILY, "telegram", context)
```

**Template categories:** Lead intake, onboarding, workouts, check-ins, at-risk alerts, milestones, renewals, exercise videos, system messages.

Each template has a **typed context interface** (e.g., `WorkoutDailyContext`, `CheckInPromptContext`) — preventing runtime render failures.

### 3. Background Job Orchestration

Six independent BullMQ queues prevent head-of-line blocking:

| Queue | Purpose |
|-------|---------|
| `workout-delivery` | Daily workout messages |
| `checkin-reminders` | Weekly check-in prompts |
| `onboarding-intake` | Post-payment onboarding flow |
| `renewal-reminders` | Subscription expiry alerts |
| `engagement` | At-risk detection, milestones, summaries |
| `message-processing` | Inbound keyword/command handling |

**Schedulers** run on cron (via `node-cron`) and **enqueue** jobs with timezone-aware delays. **Workers** process jobs independently. This separation means scheduling logic and processing logic never block each other.

### 4. Timezone-Aware Scheduling

Coaches and clients can be in different timezones. The scheduling system handles this:

1. Cron job runs at a fixed UTC time (e.g., 00:01 for daily workouts)
2. For each client, calculates delay until 7:00 AM in their timezone using `date-fns-tz`
3. Enqueues the job with that delay
4. Job fires at the client's local morning time

### 5. Idempotent Webhook Processing

All external webhooks enforce idempotency:
- **Stripe**: `stripeSessionId` (unique constraint) + upsert prevents duplicate payment records
- **WhatsApp**: `metaMessageId` (unique constraint) deduplicates inbound messages
- **Telegram**: Webhook secret header verification + chat_id routing

### 6. Event Logging

`EventLog` table records key state transitions with structured metadata:
- Coach and client IDs, event type, channel, JSON metadata, timestamp
- Indexed for efficient querying by coach, client, or event type
- Powers the Activity feed in the dashboard

---

## Integration Architecture

### WhatsApp (Meta Cloud API)

```
Inbound:  Client message → POST /webhooks → messageQueue → parser → response
Outbound: Worker/route → WhatsAppAdapter → Meta Cloud API → Client phone
Flows:    Structured forms (check-in, intake) → POST /webhooks/flow-response → DB
```

- Direct API integration (no third-party wrapper)
- Supports: plain text, video messages, Flow forms
- Webhook verification via verify token

### Telegram (Bot API)

```
Inbound:  Client message → POST /telegram/webhook → verify secret → route by chat_id → process
Outbound: Worker/route → TelegramAdapter → Bot API → Client chat
```

- **Shared bot model**: Single bot token serves all coaches
- Coach branding maintained in message content
- Inline keyboards replace WhatsApp Flows for structured input
- MarkdownV2 formatting with escape utilities
- Webhook secret verification via `X-Telegram-Bot-Api-Secret-Token` header

### Stripe Connect

```
Checkout: Coach dashboard → Create session (clientId in metadata) → Stripe hosted page
Webhook:  Payment success → POST /payments/webhook → verify signature → create Payment → transition client
```

- **Coaches are merchants** (Stripe Connect) — FitFlow is not merchant of record
- Bank transfer supported as manual fallback (coach confirms via dashboard)
- Webhook signature verification for security

### YMove (Exercise Videos)

```
Delivery: WorkoutProcessor → check exercise.ymoveId → fetch fresh URL → send via channel
```

- Exercise records linked via `ymoveId`
- URLs fetched on-demand (never cached — they expire)
- Rate limit handling with backoff
- Usage monitoring via dedicated scheduler

### Supabase

- **Auth**: Email/password signup, login, JWT verification
- **Database**: PostgreSQL accessed via Prisma ORM
- **Storage**: Client photos (check-in uploads)
- Service role key used server-side for privileged operations

---

## Background Job System

### Architecture

```
┌──────────────┐        ┌───────────┐        ┌──────────────┐
│  Schedulers   │──enq──▶│   Redis    │◀──poll──│   Workers    │
│  (node-cron)  │        │  (BullMQ)  │        │  (processors)│
└──────────────┘        └───────────┘        └──────────────┘
```

### Schedulers (Cron Jobs)

| Scheduler | Schedule | What it does |
|-----------|----------|-------------|
| `daily-scheduler` | 00:01 daily | Enqueues workout deliveries for active assignments |
| `weekly-checkin` | 08:00 Sundays | Enqueues check-in prompts for active clients |
| `renewal-scheduler` | Daily | Checks plan expiry dates, enqueues 7d/2d/post-expiry reminders |
| `engagement-scheduler` | Periodic | Detects at-risk clients (missed workouts), enqueues alerts |
| `weekly-summary-scheduler` | End of week | Enqueues weekly workout summaries |
| `missed-checkin-scheduler` | Periodic | Nudges clients who haven't submitted check-ins |
| `ymove-usage-scheduler` | Periodic | Monitors YMove API quota usage |

### Workers (Job Processors)

| Worker | Queue | Handles |
|--------|-------|---------|
| `workoutProcessor` | `workout-delivery` | Renders template, sends workout + optional video, logs event |
| `engagementWorker` | `engagement` | Processes missed workout alerts, at-risk notifications, milestones, re-engagement |

### Feature Flags

Background jobs can be toggled via environment variables:
- `ENABLE_BACKGROUND_JOBS` — Master switch (default: true)
- Separate flags for schedulers vs workers
- Startup logging indicates which systems are active

---

## Authentication & Authorization

### API Authentication Flow

1. Client (browser) authenticates with Supabase (email/password)
2. Supabase returns JWT access token
3. Token stored in localStorage, synced via `syncAuthToken()`
4. All API requests include `Authorization: Bearer <token>` header
5. API middleware (`auth.ts`) verifies token with Supabase
6. On first auth, middleware auto-creates Coach record (upsert pattern)
7. Coach ID injected into `req.user` for downstream routes

### Auto-Provisioning

New coaches are automatically provisioned on first API call:
- Coach record created with auto-generated slug and name from auth metadata
- Upsert pattern ensures idempotency (safe for concurrent requests)

---

## Frontend Architecture

### Route Structure

```
/app/
├── auth/callback           # Supabase OAuth callback
├── (auth)/
│   ├── login               # Public login page
│   └── register            # Public signup page
├── onboarding              # Post-signup coach setup
├── dashboard/              # Protected (authenticated) routes
│   ├── clients/            # Client roster & detail views
│   ├── plans/              # Workout plan builder
│   ├── messages/           # Message threads
│   ├── offers/             # Sales offers management
│   ├── leads/              # Lead pipeline
│   ├── activity/           # Event log viewer
│   ├── billing/            # Payment history
│   └── settings/           # Coach profile & channel config
├── [coachSlug]/            # Public offer landing pages
│   └── [offerSlug]/        # Specific offer signup funnel
```

### Design Principles

- **Mobile-first PWA** — Coaches operate 80% on phone
- **Radix UI primitives** — Accessible, unstyled components with Tailwind
- **Framer Motion** — Subtle animations for polish
- **Recharts** — Client progress and compliance dashboards

### Key Components

| Component | Purpose |
|-----------|---------|
| `DashboardLayout` | Main layout with navigation sidebar |
| `PlanBuilder` | Visual workout plan editor (exercises, sets, reps) |
| `ClientGrid` | Client cards with status badges |
| `DashboardStats` | KPI cards (compliance rate, revenue, active clients) |
| `/components/ui/` | Shared primitives (Button, Dialog, Input, Tabs, etc.) |

---

## Key Architectural Decisions

### ADR-1: Instagram Integration Removed (Permanent)

**Date:** April 2, 2026  
**Status:** Final — not a deferral

**Context:** Original v1 vision included Instagram automation (comment-to-DM, DM sequences).

**Decision:** Permanently removed from scope. WhatsApp and Telegram are the sole delivery channels.

**Rationale:** Focus on proven messaging channels where coaches already operate. Instagram's API restrictions and the complexity of automation made it a poor fit for MVP.

### ADR-2: Channel Abstraction Layer

**Date:** April 2, 2026  
**Status:** Implemented

**Context:** Adding Telegram as a second channel risked duplicating business logic across two messaging APIs.

**Decision:** Introduced `DeliveryChannel` interface in `packages/shared` with adapters for each channel. All business logic interacts with the interface, never directly with channel APIs.

**Consequences:**
- New channels require only a new adapter (no business logic changes)
- Template system must render for each channel independently
- Channel-specific features (WhatsApp Flows, Telegram inline keyboards) handled inside adapters

### ADR-3: Coaches as Stripe Connect Merchants

**Date:** April 6, 2026  
**Status:** Implemented

**Context:** FitFlow needed to handle client payments for coaching plans.

**Decision:** Use Stripe Connect with coaches as merchants. FitFlow orchestrates but never holds funds. Bank transfer supported as manual fallback.

**Rationale:** Avoids regulatory complexity of being merchant of record. Coaches own their payment relationship.

### ADR-4: Shared Telegram Bot Model

**Date:** April 9, 2026  
**Status:** Implemented (replaced per-coach bot model)

**Context:** Initially each coach had their own Telegram bot. This created operational overhead — provisioning, webhook management, and token storage per coach.

**Decision:** Transitioned to a shared bot with coach-branded messaging. Single bot token, single webhook endpoint, messages routed by `chat_id` to the correct coach.

**Consequences:**
- Simplified provisioning (one bot setup, not N)
- Reduced webhook management complexity
- Coach identity maintained through message content/branding
- Trade-off: coaches can't customize bot name/avatar independently

### ADR-5: Terminology — "Coach" not "Trainer"

**Date:** April 2, 2026  
**Status:** Enforced throughout codebase

**Decision:** Use "Coach" consistently in code, UI, and documentation. Never "Trainer."

**Rationale:** Aligns with how the target market self-identifies and positions the platform.

### ADR-6: Timezone-Aware Job Scheduling

**Date:** April 8, 2026  
**Status:** Implemented

**Context:** Coaches and clients span multiple timezones. Sending a workout at 3 AM is useless.

**Decision:** Schedulers run in UTC but calculate per-client delays to deliver at 7:00 AM local time using `date-fns-tz`.

**Consequences:**
- Jobs may be enqueued hours before they fire
- Redis must maintain delayed job state reliably
- Client timezone field is required for proper delivery

### ADR-7: Type-Safe Template Registry

**Date:** April 8, 2026  
**Status:** Implemented

**Context:** Outbound messages were being constructed ad-hoc across the codebase, leading to inconsistency and no channel awareness.

**Decision:** Centralized template registry with typed context interfaces. Templates are pure render functions registered at import time. `renderTemplate(id, channel, context)` is the single entry point.

**Consequences:**
- Compile-time safety for template contexts
- Channel-specific rendering (MarkdownV2 for Telegram, plain text for WhatsApp)
- All message copy centralized in `/lib/templates/`
- Adding a new template requires: define context type, register with both channel renderers

---

## Data Flows

### Workout Delivery (Daily)

```
1. daily-scheduler (00:01 UTC)
   └─▶ Query active PlanAssignments where today's weekday ∈ scheduleDays
   └─▶ For each: calculate delay until 7 AM in client.timezone
   └─▶ Enqueue WORKOUT_DELIVERY job with delay

2. workoutProcessor (fires at 7 AM client time)
   └─▶ Fetch assignment + exercises
   └─▶ renderTemplate(WORKOUT_DAILY, client.preferredChannel, context)
   └─▶ getChannel(client.preferredChannel, coachId).sendTemplate()
   └─▶ If exercises have ymoveId → fetch video URL → channel.sendVideo()
   └─▶ Log event to EventLog
```

### Lead → Client Conversion

```
1. Prospect visits /[coachSlug]/[offerSlug]?ch=wa&src=igbio
2. Submits lead form → POST /leads → Lead created (status: NEW)
3. Optional intake form → Lead updated (status: INTAKE_COMPLETE)
4. Coach reviews in /dashboard/leads
5. Coach clicks "Convert" → POST /leads/:id/convert
   └─▶ Create Client (status: PENDING_PAYMENT)
   └─▶ Generate Stripe Checkout Session
6. Client pays → Stripe webhook fires
   └─▶ POST /payments/webhook (idempotent)
   └─▶ Create Payment record
   └─▶ Transition client: PENDING_PAYMENT → INTAKE_SENT
   └─▶ Enqueue onboarding jobs (welcome message, intake form)
7. Messages from Lead record migrated to new Client record
```

### Check-In Collection (WhatsApp)

```
1. weekly-checkin scheduler (Sunday 08:00)
   └─▶ Enqueue CHECKIN_REMINDER for active clients
2. Worker sends check-in prompt via WhatsApp Flow
3. Client fills form (weight, energy 1-5, sleep, notes)
4. POST /webhooks/flow-response
   └─▶ Parse Flow payload → Create CheckIn record
   └─▶ Send CHECKIN_COACH_ACK to client
   └─▶ Evaluate at-risk indicators
```

### Engagement & At-Risk Detection

```
1. engagement-scheduler detects:
   - 1 missed workout → MISSED_WORKOUT alert
   - 3+ consecutive misses → ATRISK_THREE_PLUS escalation
   - No activity for extended period → ATRISK_LAPSED
2. Enqueues to engagement queue
3. engagementWorker renders appropriate template, sends via channel
4. Coach sees alert in Activity log
```

---

## Deployment Architecture

### Infrastructure

| Service | Provider | Purpose |
|---------|----------|---------|
| Frontend | Vercel | Next.js SSR + static hosting |
| API + Workers | Railway | Express server + BullMQ workers |
| Database | Supabase | Managed PostgreSQL |
| Job Queue | Redis (Upstash or Railway) | BullMQ backing store |
| Payments | Stripe | Payment processing |
| WhatsApp | Meta Cloud API | Business messaging |
| Telegram | Telegram Bot API | Bot messaging |

### Build Pipeline

```bash
# From monorepo root
pnpm install
pnpm turbo build    # Builds shared → API → Web (respects dependency graph)

# API build specifically
prisma generate && tsc   # Generates Prisma client, then compiles TypeScript
```

### Railway Configuration

```toml
[build]
builder = "nixpacks"
buildCommand = "pnpm install && pnpm --filter @fitflow/shared build && pnpm --filter @fitflow/api build"

[deploy]
startCommand = "pnpm --filter @fitflow/api start"
healthcheckPath = "/health"
```

### Required Environment Variables

**API (`apps/api/.env`):**
- `DATABASE_URL` / `DIRECT_URL` — Supabase PostgreSQL (pooled + direct)
- `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` — Auth verification
- `META_WHATSAPP_ACCESS_TOKEN` / `META_WHATSAPP_PHONE_NUMBER_ID` — WhatsApp Cloud API
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — Payment processing
- `REDIS_URL` — BullMQ job queue
- `DEFAULT_TG_BOT_TOKEN` / `TG_WEBHOOK_SECRET` — Telegram shared bot
- `API_BASE_URL` — For webhook URL registration
- `ANTHROPIC_API_KEY` (optional) — Claude NLP parsing
- `YMOVE_API_KEY` (optional) — Exercise video API

**Web (`apps/web/.env.local`):**
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

---

## Project Evolution Timeline

| Date | Milestone | Key Changes |
|------|-----------|-------------|
| Feb 27, 2026 | **Project initialized** | Monorepo setup, Next.js dashboard, Express API, WhatsApp Flows |
| Apr 2, 2026 | **Multi-channel pivot** | Telegram added, Instagram removed permanently, channel abstraction, leads/offers system |
| Apr 6-7, 2026 | **Payments infrastructure** | Stripe Connect integration, billing plans, centralized auth sync |
| Apr 8, 2026 | **Automation engine** | Template system, engagement workflows, YMove integration, advanced schedulers |
| Apr 9, 2026 | **Telegram refinement** | Shared bot model (replacing per-coach bots), coach auto-provisioning, lead-to-client migration |

---

## File Reference (Critical Paths)

### Core Business Logic
- `apps/api/src/lib/channels/channel-router.ts` — Channel adapter factory
- `apps/api/src/lib/templates/registry.ts` — Template registration system
- `apps/api/src/lib/templates/render.ts` — Template rendering entry point
- `apps/api/src/workers/workoutProcessor.ts` — Workout delivery logic
- `apps/api/src/workers/engagementWorker.ts` — Engagement/at-risk processing
- `packages/shared/src/channels/types.ts` — DeliveryChannel interface
- `packages/shared/src/templates/types.ts` — Template type definitions

### Integration Points
- `apps/api/src/lib/meta.ts` — WhatsApp Cloud API
- `apps/api/src/lib/telegram.ts` — Telegram Bot API
- `apps/api/src/lib/stripe.ts` — Stripe payment operations
- `apps/api/src/lib/bot-provisioner.ts` — Telegram webhook registration
- `apps/api/src/services/ymove.ts` — Exercise video API

### Webhook Handlers
- `apps/api/src/routes/webhooks.ts` — WhatsApp inbound
- `apps/api/src/routes/telegram-webhook.ts` — Telegram inbound
- `apps/api/src/routes/payment-webhook.ts` — Stripe payment events

### Database & Auth
- `apps/api/prisma/schema.prisma` — Complete database schema
- `apps/api/src/middleware/auth.ts` — Supabase JWT verification + coach auto-create
- `apps/web/src/lib/auth.ts` — Frontend token management
