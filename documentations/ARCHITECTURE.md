# FitFlow Architecture Documentation

> Last updated: April 25, 2026

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
9. [Subscription & Billing System](#subscription--billing-system)
10. [Meal Planning System](#meal-planning-system)
11. [AI Risk Scoring](#ai-risk-scoring)
12. [Lead Management & Offers](#lead-management--offers)
13. [Public Profiles (ftfw.fit)](#public-profiles-ftwfit)
14. [Admin Dashboard](#admin-dashboard)
15. [Frontend Architecture](#frontend-architecture)
16. [Key Architectural Decisions](#key-architectural-decisions)
17. [Data Flows](#data-flows)
18. [API Documentation](#api-documentation)
19. [Deployment Architecture](#deployment-architecture)

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

### Core Entities (22 Models)

```
Coach ──┬── Client ──┬── PlanAssignment ── WorkoutPlan ── WorkoutDay ── WorkoutExercise
        │            ├── MealAssignment ── MealPlan ── MealDay ── MealEntry ── Meal
        │            ├── CheckIn (weekly weight/energy/sleep)
        │            ├── WorkoutLog (completion tracking)
        │            ├── MealLog (meal completion tracking)
        │            ├── Payment (Stripe + bank transfer)
        │            ├── SessionBlock (pre-paid sessions)
        │            ├── Message (conversation history)
        │            └── ClientRiskScore (AI-computed churn risk)
        │
        ├── WorkoutPlan (templates)
        ├── MealPlan (templates)
        ├── Exercise (library, linked to YMove)
        ├── Offer ── Lead ── Message
        ├── ShortLink (URL shortener with click tracking)
        ├── Subscription (SaaS billing tier)
        ├── BotRegistry (Telegram bot config)
        ├── SlugRedirect (vanity URL redirects)
        ├── ProfileEvent (landing page analytics)
        └── EventLog (audit trail)
```

### Client Status State Machine

```
PENDING_PAYMENT ──▶ INTAKE_SENT ──▶ INTAKE_COMPLETE ──▶ PLAN_ASSIGNED ──▶ ACTIVE ──▶ PAUSED
                                                                                  └──▶ INACTIVE
```

Each transition is triggered by a specific event:
- **PENDING_PAYMENT → INTAKE_SENT**: Stripe webhook confirms payment, or bank transfer confirmed by coach
- **INTAKE_SENT → INTAKE_COMPLETE**: Client submits intake form (consumes intakeToken)
- **INTAKE_COMPLETE → PLAN_ASSIGNED**: Coach assigns a workout plan
- **PLAN_ASSIGNED → ACTIVE**: First workout delivered
- **ACTIVE → PAUSED/INACTIVE**: Coach manual action or automated lapse detection

### Lead Status State Machine

```
NEW ──▶ INTAKE_COMPLETE ──▶ PAYMENT_PENDING ──▶ CONVERTED
                                            └──▶ REJECTED
```

- **NEW**: Lead created from offer landing page or Telegram /start
- **INTAKE_COMPLETE**: Lead submits intake questionnaire (consumes intakeToken)
- **PAYMENT_PENDING**: Coach requests payment from lead
- **CONVERTED**: Lead promoted to Client via `POST /leads/:id/convert`
- **REJECTED**: Coach rejects the lead

### Key Enums (12 total)

| Enum | Values |
|------|--------|
| `MessageChannel` | `WHATSAPP`, `TELEGRAM` |
| `ClientStatus` | `PENDING_PAYMENT`, `INTAKE_SENT`, `INTAKE_COMPLETE`, `PLAN_ASSIGNED`, `ACTIVE`, `PAUSED`, `INACTIVE` |
| `PaymentStatus` | `PENDING`, `SUCCEEDED`, `FAILED` |
| `PaymentMethod` | `STRIPE`, `BANK_TRANSFER` |
| `PaymentModel` | `SESSION_BLOCKS`, `PER_SESSION`, `MONTHLY_RETAINER` |
| `WorkoutStatus` | `COMPLETED`, `SKIPPED`, `MODIFIED` |
| `MealStatus` | `COMPLETED`, `SKIPPED`, `MODIFIED` |
| `LeadStatus` | `NEW`, `INTAKE_COMPLETE`, `PAYMENT_PENDING`, `CONVERTED`, `REJECTED` |
| `SubscriptionTier` | `STARTER`, `PRO`, `STUDIO` |
| `SubscriptionStatus` | `TRIALING`, `ACTIVE`, `PAST_DUE`, `CANCELED`, `UNPAID`, `INCOMPLETE` |
| `BillingInterval` | `MONTHLY`, `ANNUAL` |
| `RiskLevel` | `LOW`, `MODERATE`, `HIGH`, `CRITICAL` |

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

Eight independent BullMQ queues prevent head-of-line blocking:

| Queue | Purpose |
|-------|---------|
| `workout-delivery` | Daily workout messages |
| `meal-delivery` | Daily meal plan messages |
| `checkin-reminders` | Weekly check-in prompts |
| `onboarding-intake` | Post-payment onboarding flow |
| `renewal-reminders` | Subscription expiry alerts |
| `engagement` | At-risk detection, milestones, summaries |
| `message-processing` | Inbound keyword/command handling |
| `risk-scoring` | AI risk score computation |

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

### Anthropic Claude (AI)

```
Plan Generation:  Coach request → POST /plans/generate → Claude API → structured plan → save to DB
Meal Generation:  Coach request → POST /meal-plans/generate → Claude API → structured meal plan → save to DB
Risk Scoring:     risk-scoring-scheduler → riskScoringWorker → Claude API → score + summary + suggestion → DB
```

- **Model**: Claude Haiku (cost-optimized for structured output)
- **Services**: `aiPlanGenerator.ts`, `aiMealPlanGenerator.ts`, `aiRiskSummary.ts`
- Prompt injection defenses applied to user-supplied instructions
- Structured output parsing with fallback on malformed responses

### Spoonacular (Nutrition Data)

```
Ingredient Search:  GET /nutrition/ingredients?q=chicken → Spoonacular API → macros + calories
Recipe Search:      GET /nutrition/recipes?q=high+protein → Spoonacular API → recipe list
Recipe Detail:      GET /nutrition/recipes/:id → Spoonacular API → full recipe with macros
```

- **Client**: `lib/spoonacular.ts` wraps the Spoonacular REST API
- Used for meal plan creation — coaches search for foods and import nutrition data
- Rate-limited by API key quota

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

### Schedulers (9 Cron Jobs)

| Scheduler | Schedule | What it does |
|-----------|----------|-------------|
| `daily-scheduler` | 00:01 daily | Enqueues workout deliveries for active assignments |
| `daily-meal-scheduler` | 00:01 daily | Enqueues meal plan deliveries for active meal assignments |
| `weekly-checkin` | 08:00 Sundays | Enqueues check-in prompts for active clients |
| `renewal-scheduler` | Daily | Checks plan expiry dates, enqueues 7d/2d/post-expiry reminders |
| `engagement-scheduler` | Periodic | Detects at-risk clients (missed workouts), enqueues alerts |
| `weekly-summary-scheduler` | End of week | Enqueues weekly workout summaries |
| `missed-checkin-scheduler` | Periodic | Nudges clients who haven't submitted check-ins |
| `risk-scoring-scheduler` | Periodic | Enqueues AI risk score computation for active clients |
| `ymove-usage-scheduler` | Periodic | Monitors YMove API quota usage |

### Workers (4 Job Processors)

| Worker | Queue | Handles |
|--------|-------|---------|
| `workoutProcessor` | `workout-delivery` | Renders template, sends workout + optional video, logs event |
| `mealProcessor` | `meal-delivery` | Renders meal template, sends daily meal plan via channel |
| `engagementWorker` | `engagement` | Processes missed workout alerts, at-risk notifications, milestones, re-engagement |
| `riskScoringWorker` | `risk-scoring` | Computes AI risk score (0-100) with factor breakdown, stores in ClientRiskScore |

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

## Subscription & Billing System

FitFlow uses a three-tier SaaS subscription model for coaches, separate from client payment processing.

### Tier Definitions

Defined in `packages/shared/src/subscription.ts`:

| Feature | STARTER | PRO | STUDIO |
|---------|---------|-----|--------|
| Max Clients | 10 | 30 | 75 |
| Max Channels | 1 | 2 | 2 |
| Analytics Dashboard | No | Yes | Yes |
| Payment Collection | Yes | Yes | Yes |
| Check-in Sequences | No | Yes | Yes |
| White Label | No | No | Yes |

**Pricing** (stored in cents, billed via Stripe):
- USD: $19/$49/$99 monthly — $15/$39/$79 annual
- GBP: £15/£39/£79 monthly — £12/£31/£63 annual

**Trial period**: 7 days (configured via `TRIAL_DAYS` constant).

### Middleware Enforcement

```typescript
// apps/api/src/middleware/subscription.ts

// Gate entire route to specific tiers
router.post("/checkout", authenticate, requireTier("STARTER", "PRO", "STUDIO"), handler);

// Enforce resource limits within a tier
router.post("/", authenticate, enforceLimit("clients"), validate(schema), handler);
```

- `requireTier(...tiers)` — Returns 403 with `code: TIER_REQUIRED` if coach's tier is not in the allowed list
- `enforceLimit(resource)` — Counts existing resources, returns 403 with `code: LIMIT_REACHED` if at max

### Stripe Integration Flow

```
1. Coach selects tier → POST /subscriptions/checkout
   └─▶ Creates Stripe Customer (if first time)
   └─▶ Creates Checkout Session with selected price ID
   └─▶ Returns hosted checkout URL

2. Coach completes payment → Stripe fires webhook
   └─▶ POST /subscriptions/webhook (express.raw() for signature verification)
   └─▶ Handles: subscription.created, subscription.updated, subscription.deleted
   └─▶ Upserts Subscription record in DB

3. Ongoing: invoice.payment_succeeded → renew, invoice.payment_failed → mark PAST_DUE
4. Trial ending: customer.subscription.trial_will_end → send reminder
```

**Important**: Payment webhooks and subscription webhooks use **separate Stripe webhook secrets** (`STRIPE_WEBHOOK_SECRET` vs `STRIPE_SUBSCRIPTION_WEBHOOK_SECRET`) because they are mounted as separate Express routes with their own `express.raw()` middleware.

---

## Meal Planning System

Mirrors the workout plan architecture, providing a parallel system for nutrition delivery.

### Data Model

```
MealPlan ── MealDay ── MealEntry ── Meal
   │
   └── MealAssignment ── MealLog
```

- **MealPlan**: Title, description, tags, template flag. Owned by a coach.
- **MealDay**: Day number (1-14) + title within a plan.
- **MealEntry**: Links a Meal to a day with order, serving size, and notes.
- **Meal**: Global food database — name, category (breakfast/lunch/dinner/snack), macros (protein/carbs/fat/calories), ingredients, prep time, recipe URL. Optionally linked to Spoonacular via `spoonacularId`.
- **MealAssignment**: Assigns a meal plan to a client with schedule days and compliance tracking.
- **MealLog**: Tracks daily completion (COMPLETED, SKIPPED, MODIFIED).

### AI Generation

`POST /meal-plans/generate` calls `aiMealPlanGenerator.ts` which:
1. Loads the coach's existing meal library
2. Optionally fetches the target client's goals and dietary preferences
3. Sends structured prompt to Claude with available meals
4. Parses the response into a MealPlan with days and entries
5. Saves to the database

### Delivery Pipeline

```
daily-meal-scheduler (00:01 UTC)
  └─▶ Query active MealAssignments where today ∈ scheduleDays
  └─▶ For each: calculate delay until 7 AM in client.timezone
  └─▶ Enqueue MEAL_DELIVERY job

mealProcessor (fires at 7 AM client time)
  └─▶ Fetch assignment + meal day + entries
  └─▶ renderTemplate(MEAL_DAILY, channel, context)
  └─▶ channel.sendTemplate()
  └─▶ Log event MEAL_DELIVERED
```

### Nutrition API Integration

The `/nutrition/*` routes proxy to the Spoonacular API for ingredient and recipe search:
- `GET /nutrition/ingredients?q=chicken` — Search with macro data
- `GET /nutrition/recipes?q=high+protein&diet=keto` — Recipe search with dietary filters
- `GET /nutrition/recipes/:id` — Full recipe detail

Coaches use this to populate their meal library before building plans.

---

## AI Risk Scoring

Proactive churn detection using AI-computed risk scores for each client.

### Data Model

```typescript
// apps/api/prisma/schema.prisma
model ClientRiskScore {
  score      Int       // 0-100 (higher = more at risk)
  level      RiskLevel // LOW (<25), MODERATE (25-50), HIGH (50-75), CRITICAL (>75)
  summary    String    // AI-generated explanation
  factors    Json      // { compliance, engagement, activity, behavioral, payment }
  suggestion String?   // AI-generated recommended action for the coach
}
```

### Computation Pipeline

```
risk-scoring-scheduler (periodic)
  └─▶ Queries active clients
  └─▶ Enqueues RISK_SCORE_COMPUTE job per client

riskScoringWorker
  └─▶ Gathers signals: workout logs, check-ins, message activity, payment history
  └─▶ riskScorer.ts computes factor scores
  └─▶ aiRiskSummary.ts sends to Claude for natural language summary + suggestion
  └─▶ Upserts ClientRiskScore record
```

### Factor Breakdown

| Factor | What it measures | Data source |
|--------|-----------------|-------------|
| Compliance | Workout/meal completion rate | WorkoutLog, MealLog |
| Engagement | Message frequency, check-in submissions | Message, CheckIn |
| Activity | Days since last activity | WorkoutLog, CheckIn timestamps |
| Behavioral | Trend analysis (declining vs improving) | Historical logs |
| Payment | Payment history, overdue status | Payment records |

### Dashboard Integration

Risk scores surface in the coach dashboard:
- At-risk client cards on the overview page
- `GET /clients/:id/risk-score` returns score, level, summary, factors, and suggestion
- Color-coded badges: green (LOW), yellow (MODERATE), orange (HIGH), red (CRITICAL)

---

## Lead Management & Offers

### Offer System

Coaches create **Offers** — marketing funnels with unique slugs that generate landing pages.

```
Coach creates Offer
  └─▶ slug: "summer-shred"
  └─▶ Landing page at: /p/{coachSlug}/summer-shred
  └─▶ Links shared on social media (Instagram bio, WhatsApp status)
  └─▶ Prospects visit → submit form → Lead created
```

Each Offer has:
- **channelParam**: Pre-select WhatsApp or Telegram for the lead
- **sourceTags**: Track traffic source (e.g., "igbio", "story", "whatsapp-status")
- **ctaType**: Call-to-action variant
- **paymentRoute**: Whether to route directly to payment

### Lead Lifecycle

```
1. Prospect visits landing page → GET /p/:coachSlug/:offerSlug
2. Submits application → POST /p/:coachSlug/:offerSlug/apply
   └─▶ Lead created (status: NEW, linked to Offer)
   └─▶ If Telegram: intake questionnaire starts automatically via bot

3. Coach reviews in /dashboard/leads
   └─▶ Can send messages to lead via Telegram
   └─▶ Can trigger intake form: POST /leads/:id/start-intake

4. Coach converts: POST /leads/:id/convert
   └─▶ Creates Client record
   └─▶ Migrates all messages from Lead → Client
   └─▶ Lead status → CONVERTED
```

### Short Links

Coaches create branded short links for tracking:
- `POST /short-links` — Create link with custom code
- `GET /go/:code` — Resolve and redirect (increments click counter)
- QR code generation: `GET /short-links/:id/qr`

---

## Public Profiles (ftfw.fit)

Coaches get public-facing landing pages accessible without authentication.

### Profile Pages

- **URL**: `/p/profile/:slug` (or vanity domain ftfw.fit/:slug)
- **Content**: Coach name, bio, avatar, specialities, rates, active offers, channel links
- **Privacy controls**: `profileVisible`, `showRatesPublicly`, `showWhatsapp`, `showTelegram` fields on Coach model

### Slug Management

When a coach changes their slug:
1. A `SlugRedirect` is created mapping `oldSlug` → `newSlug`
2. Redirect expires after 90 days (`expiresAt`)
3. Visitors to the old slug are seamlessly redirected to the new one
4. Event logged: `PROFILE_REDIRECT`

### Analytics

Every profile interaction is tracked via `ProfileEvent`:

| Event | Trigger |
|-------|---------|
| `viewed` | Page load |
| `channel_click` | Visitor clicks WhatsApp/Telegram link |
| `redirect` | Visitor arrived via old slug redirect |
| `link_copied` | Visitor copies profile link |

IP addresses are hashed (using `IP_HASH_SALT`) for privacy — no raw IPs stored.

---

## Admin Dashboard

Platform-level management for FitFlow operators.

### Access Control

```typescript
// apps/api/src/middleware/admin.ts
const adminIds = process.env.PLATFORM_ADMIN_IDS?.split(",") ?? [];

// Usage: router.get("/overview", authenticate, requirePlatformAdmin, handler);
```

Admin is determined by the `PLATFORM_ADMIN_IDS` environment variable (comma-separated coach UUIDs). There is no separate admin user model — admins are coaches with elevated access.

### Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /admin/overview` | Platform KPIs: total coaches, clients, active subs, MRR, tier breakdown |
| `GET /admin/coaches` | Paginated, searchable, filterable coach list with subscription + client counts |
| `GET /admin/coaches/:id` | Coach detail with subscription, revenue, recent events |
| `GET /admin/coaches/:id/clients` | Coach's client list |
| `GET /admin/revenue` | MRR by tier, monthly trend, payment volume, churn rate |
| `GET /admin/events` | Platform-wide event log with type/coach/date filtering |

### Frontend

The admin dashboard lives at `/admin/*` routes in the web app, protected by the `AdminGuard` component which checks the coach's ID against admin status.

---

## Frontend Architecture

### Route Structure

```
/app/
├── auth/callback              # Supabase OAuth callback
├── (auth)/
│   ├── login                  # Public login page
│   └── register               # Public signup page
├── onboarding/                # Post-signup coach setup
├── setup/                     # Initial onboarding wizard
├── dashboard/                 # Protected (authenticated) routes
│   ├── clients/               # Client roster & detail views
│   │   ├── new                # Add client form
│   │   └── [id]               # Client detail (assignments, check-ins, logs, messages)
│   ├── plans/                 # Workout plan library
│   │   ├── new                # Plan builder
│   │   └── [id]               # Plan editor
│   ├── meal-plans/            # Meal plan library
│   │   ├── new                # Meal plan builder
│   │   └── [id]               # Meal plan editor
│   ├── messages/              # Message threads (WhatsApp/Telegram)
│   ├── offers/                # Sales offers management
│   ├── leads/                 # Lead pipeline
│   ├── activity/              # Event log viewer
│   ├── billing/               # Payment history
│   ├── subscription/          # Tier selection, invoices, Stripe portal
│   └── settings/              # Coach profile & channel config
├── admin/                     # Platform admin dashboard (role-gated)
├── t/[slug]                   # Coach profile landing pages (ftfw.fit)
│   └── [offerSlug]            # Offer-specific signup funnels
├── [coachSlug]/               # Public offer landing pages
│   └── [offerSlug]/           # Specific offer signup funnel
├── go/                        # Short link redirect
```

### Design Principles

- **Mobile-first PWA** — Coaches operate 80% on phone
- **Radix UI primitives** — Accessible, unstyled components with Tailwind
- **Framer Motion** — Subtle animations for polish
- **Recharts** — Client progress and compliance dashboards

### Key Components

| Component | Purpose |
|-----------|---------|
| `DashboardLayout` | Main layout with collapsible sidebar, notifications, navigation |
| `PlanBuilder` | Visual workout plan editor (exercises, sets, reps, drag-and-drop) |
| `MealPlanBuilder` | Meal plan editor (meals, servings, macros) |
| `TemplatePicker` | Workout plan template browser with tag filtering |
| `MealTemplatePicker` | Meal plan template browser |
| `ClientGrid` | Client cards with status badges and compliance indicators |
| `DashboardStats` | Animated KPI cards (compliance rate, revenue, active clients) |
| `RiskScoreCard` | At-risk client alerts with factor breakdown |
| `PricingTiers` | Subscription tier selector with monthly/annual toggle |
| `UpgradePrompt` | Feature-gated upsell for tier-locked features |
| `WhatsAppRulesSection` | WhatsApp Business messaging rules info |
| `WhatsAppWindowBanner` | 24-hour messaging window status alert |
| `AdminGuard` | Admin role protection wrapper component |
| `/components/ui/` | Shared primitives (Modal, Toast, FormField, StatusBadge, Spinner, etc.) |

### Design System

- **Fonts**: Newsreader (serif headings), DM Sans (body), IBM Plex Mono (code)
- **Theme**: Dark-mode only — `bg-primary: #0a0a0b`, text: `#f0f0f0`
- **Colors**: Green (#25D366), Blue (#4E97F8), Orange (#F0853A), Violet (#9D7CF4), Red (#EF5350)
- **Tokens**: `lib/tokens.ts` — transitions, focus rings, z-index scale, formatters
- **Animation**: Framer Motion — staggered grid, card entrance, dropdown transitions

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

## API Documentation

The API is fully documented with an OpenAPI 3.0 specification generated from Zod schemas.

### Interactive Documentation

Visit `http://localhost:3001/docs` when the API is running to browse the Swagger UI.

### Regenerating the Spec

```bash
pnpm --filter @fitflow/api docs:generate
```

This reads the registry from `src/docs/openapi.ts` (which imports Zod schemas from `src/docs/schemas.ts` and `src/lib/schemas.ts`) and outputs `apps/api/openapi.json`.

### Architecture

- **Request schemas**: Derived from existing Zod validation in `lib/schemas.ts` — single source of truth
- **Response schemas**: Defined in `src/docs/schemas.ts` to capture Prisma return shapes + computed fields
- **Route registry**: `src/docs/openapi.ts` maps every endpoint to its OpenAPI definition
- **Generator**: `src/docs/generate.ts` produces the final `openapi.json`
- **UI**: `swagger-ui-express` serves the spec at `/docs`

### Route Coverage

86 documented paths across 23 tag groups covering all 27 route files:

| Tag | Description | Auth |
|-----|-------------|------|
| Clients | Client CRUD, intake, risk score | Yes |
| Plans | Workout plan CRUD, AI generation, templates | Yes |
| Assignments | Plan assignment to clients | Yes |
| Exercises | Local + YMove exercise search | Yes |
| Meal Plans | Meal plan CRUD, AI generation, templates | Yes |
| Meal Assignments | Meal plan assignment to clients | Yes |
| Meals | Meal database CRUD | Yes |
| Nutrition | Spoonacular ingredient/recipe search | Yes |
| Messages | Conversation threads, send, window status | Yes |
| Payments | Checkout, bank transfer, reminders, receipts | Yes |
| Subscriptions | Tiers, status, checkout, portal, invoices | Yes |
| Coaches | Profile, onboarding, Stripe Connect, channels | Yes |
| Leads | Lead CRUD, conversion, intake, messaging | Yes |
| Offers | Marketing offer CRUD | Yes |
| Analytics | Summary KPIs, event log | Yes (PRO+) |
| Admin | Platform admin dashboard | Yes (Admin) |
| Short Links | URL shortener, QR codes | Mixed |
| Public Profiles | Coach landing pages, analytics events | No |
| Intake | Client onboarding form submission | No |
| Flows | WhatsApp Flow management | Yes (Admin) |
| Meta Templates | WhatsApp template registration | Yes |
| Coach Exercises | Natural language exercise commands | Yes |
| Webhooks | WhatsApp, Telegram, Stripe webhooks | Signature |

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
| Apr 10-14, 2026 | **Meal planning & nutrition** | Meal plan CRUD, AI generation, Spoonacular integration, meal delivery pipeline |
| Apr 15-18, 2026 | **Subscription system** | Three-tier billing (STARTER/PRO/STUDIO), Stripe subscriptions, tier enforcement middleware |
| Apr 19-21, 2026 | **Admin & risk scoring** | Admin dashboard, platform analytics, AI risk scoring pipeline, client risk cards |
| Apr 22-24, 2026 | **Public profiles & polish** | Coach landing pages (ftfw.fit), slug management, profile analytics, animated UI, security hardening |
| Apr 25, 2026 | **Documentation & API spec** | OpenAPI 3.0 spec, Swagger UI, comprehensive docs, README files |

---

## File Reference (Critical Paths)

### Core Business Logic
- `apps/api/src/lib/channels/channel-router.ts` — Channel adapter factory
- `apps/api/src/lib/templates/registry.ts` — Template registration system
- `apps/api/src/lib/templates/render.ts` — Template rendering entry point
- `apps/api/src/workers/workoutProcessor.ts` — Workout delivery logic
- `apps/api/src/workers/mealProcessor.ts` — Meal plan delivery logic
- `apps/api/src/workers/engagementWorker.ts` — Engagement/at-risk processing
- `apps/api/src/workers/riskScoringWorker.ts` — AI risk score computation
- `packages/shared/src/channels/types.ts` — DeliveryChannel interface
- `packages/shared/src/templates/types.ts` — Template type definitions
- `packages/shared/src/subscription.ts` — Tier limits and pricing definitions

### AI Services
- `apps/api/src/services/aiPlanGenerator.ts` — Claude-powered workout plan generation
- `apps/api/src/services/aiMealPlanGenerator.ts` — Claude-powered meal plan generation
- `apps/api/src/services/aiRiskSummary.ts` — Claude-powered risk assessment summaries
- `apps/api/src/services/riskScorer.ts` — Risk score factor computation

### Integration Points
- `apps/api/src/lib/meta.ts` — WhatsApp Cloud API
- `apps/api/src/lib/telegram.ts` — Telegram Bot API
- `apps/api/src/lib/stripe.ts` — Stripe payment operations
- `apps/api/src/lib/bot-provisioner.ts` — Telegram webhook registration
- `apps/api/src/lib/spoonacular.ts` — Spoonacular nutrition API
- `apps/api/src/services/ymove.ts` — Exercise video API

### Middleware
- `apps/api/src/middleware/auth.ts` — Supabase JWT verification + coach auto-create
- `apps/api/src/middleware/subscription.ts` — `requireTier()` and `enforceLimit()` guards
- `apps/api/src/middleware/admin.ts` — `requirePlatformAdmin` access control
- `apps/api/src/middleware/validate.ts` — Zod schema validation

### Webhook Handlers
- `apps/api/src/routes/webhooks.ts` — WhatsApp inbound messages & flows
- `apps/api/src/routes/telegram-webhook.ts` — Telegram inbound messages & callbacks
- `apps/api/src/routes/payment-webhook.ts` — Stripe payment events (checkout.session.completed)
- `apps/api/src/routes/subscription-webhook.ts` — Stripe subscription lifecycle events

### API Documentation
- `apps/api/src/docs/openapi.ts` — OpenAPI route registry (all 86 paths)
- `apps/api/src/docs/schemas.ts` — Response Zod schemas for OpenAPI
- `apps/api/src/docs/generate.ts` — Spec generator script
- `apps/api/openapi.json` — Generated OpenAPI 3.0 spec

### Database & Auth
- `apps/api/prisma/schema.prisma` — Complete database schema (22 models, 12 enums)
- `apps/api/src/lib/env.ts` — Environment variable validation (Zod)
- `apps/api/src/lib/schemas.ts` — Request body validation schemas
- `apps/web/src/lib/auth.ts` — Frontend token management
- `apps/web/src/middleware.ts` — Route protection and domain routing
