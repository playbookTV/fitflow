# @fitflow/api

Express.js backend for the FitFlow coaching platform. Handles REST API routes, webhook processing, background job scheduling, and worker execution.

---

## Directory Structure

```
src/
├── index.ts               Entry point — Express app setup, middleware, route mounting
├── routes/                27 route files (one per resource/feature)
│   ├── clients.ts         Client CRUD, intake, risk score
│   ├── coaches.ts         Coach profile, onboarding, Stripe Connect, channels
│   ├── plans.ts           Workout plan CRUD, AI generation, templates
│   ├── assignments.ts     Plan assignments to clients
│   ├── exercises.ts       Exercise search (local + YMove + unified)
│   ├── meal-plans.ts      Meal plan CRUD, AI generation, templates
│   ├── meal-assignments.ts Meal plan assignments
│   ├── meals.ts           Meal database CRUD
│   ├── nutrition.ts       Spoonacular ingredient/recipe search
│   ├── messages.ts        Conversations, send, window status, pin/archive
│   ├── payments.ts        Checkout, bank transfer, reminders, receipts
│   ├── subscriptions.ts   Tiers, status, checkout, portal, invoices
│   ├── leads.ts           Lead CRUD, conversion, intake, messaging
│   ├── offers.ts          Marketing offer CRUD
│   ├── analytics.ts       Coach analytics summary, event log
│   ├── admin.ts           Platform admin dashboard (KPIs, coach mgmt, revenue)
│   ├── intake.ts          Public intake form submission
│   ├── public.ts          Public coach profiles, offer landing pages
│   ├── short-links.ts     URL shortener with click tracking
│   ├── coach-exercises.ts Natural language exercise commands
│   ├── flows.ts           WhatsApp Flow management (admin)
│   ├── meta-templates.ts  WhatsApp template registration
│   ├── webhooks.ts        WhatsApp inbound messages & flows
│   ├── telegram-webhook.ts Telegram inbound messages & callbacks
│   ├── payment-webhook.ts Stripe payment events
│   └── subscription-webhook.ts Stripe subscription events
├── middleware/
│   ├── auth.ts            Supabase JWT verification + coach auto-provisioning
│   ├── subscription.ts    requireTier() and enforceLimit() guards
│   ├── admin.ts           requirePlatformAdmin access control
│   └── validate.ts        Zod schema validation middleware
├── lib/
│   ├── channels/          Channel abstraction layer
│   │   ├── channel-router.ts   getChannel(channel, coachId) factory
│   │   ├── whatsapp-adapter.ts Meta Cloud API adapter
│   │   └── telegram-adapter.ts Telegram Bot API adapter
│   ├── templates/         Message template system (19 template files)
│   │   ├── registry.ts    Template registration (Map-based)
│   │   └── render.ts      renderTemplate() entry point
│   ├── env.ts             Environment variable validation (Zod)
│   ├── prisma.ts          Prisma client singleton
│   ├── redis.ts           Redis connection singleton
│   ├── queue.ts           BullMQ queue factory (8 queues)
│   ├── schemas.ts         Zod request body validation schemas
│   ├── stripe.ts          Stripe API client
│   ├── meta.ts            Meta WhatsApp Cloud API client
│   ├── telegram.ts        Telegram Bot API client
│   ├── spoonacular.ts     Spoonacular nutrition API client
│   ├── event-logger.ts    Fire-and-forget event logging (70+ event types)
│   ├── bot-provisioner.ts Telegram shared bot webhook setup
│   ├── time.ts            Timezone utilities (date-fns-tz)
│   ├── types.ts           TypeScript type definitions
│   └── background-jobs.ts Worker/scheduler enablement flags
├── services/
│   ├── aiPlanGenerator.ts      Claude-powered workout plan generation
│   ├── aiMealPlanGenerator.ts  Claude-powered meal plan generation
│   ├── aiRiskSummary.ts        Claude-powered risk assessment
│   ├── riskScorer.ts           Risk score factor computation
│   ├── exerciseCache.ts        YMove video URL caching
│   ├── exerciseDelivery.ts     Exercise delivery logic
│   ├── messageBuilder.ts       Template message composition
│   ├── pendingExercise.ts      Pending exercise tracking
│   └── ymove.ts                YMove exercise library API
├── jobs/                  Cron-based schedulers (9 total)
│   ├── daily-scheduler.ts       Daily workout delivery (00:01 UTC)
│   ├── daily-meal-scheduler.ts  Daily meal delivery (00:01 UTC)
│   ├── weekly-checkin.ts        Weekly check-in prompts (Sunday 08:00)
│   ├── renewal-scheduler.ts     Billing renewal reminders
│   ├── engagement-scheduler.ts  At-risk detection, milestones
│   ├── weekly-summary-scheduler.ts  Week recaps
│   ├── missed-checkin-scheduler.ts  Missed check-in nudges
│   ├── risk-scoring-scheduler.ts    AI risk score computation
│   └── ymove-usage-scheduler.ts     YMove quota monitoring
├── workers/               BullMQ job processors (4 total)
│   ├── workoutProcessor.ts      Workout delivery (template + video)
│   ├── mealProcessor.ts         Meal plan delivery
│   ├── engagementWorker.ts      Engagement alerts, milestones, re-engagement
│   └── riskScoringWorker.ts     AI risk score computation
├── docs/                  OpenAPI documentation
│   ├── openapi.ts         Route registry (86 paths, 23 tags)
│   ├── schemas.ts         Response Zod schemas (70 schema definitions)
│   └── generate.ts        Spec generator → openapi.json
├── handlers/              Command routers (exercise delivery)
├── parser/                Message parsing (regex + Claude NLP)
└── flows/                 WhatsApp Flow JSON schemas
```

## Running Locally

```bash
# From repo root
pnpm --filter @fitflow/api dev    # tsx watch src/index.ts (hot reload on :3001)

# Or start worker separately
pnpm --filter @fitflow/api worker:start
```

Required services:
- PostgreSQL (Supabase or local)
- Redis (local `redis-server` or Upstash)

Copy `.env.example` to `.env` and fill in credentials. See [DEPLOYMENT.md](../../DEPLOYMENT.md) for the full env var reference.

## Authentication

All protected routes use Supabase JWT verification:

```
Client → Authorization: Bearer <supabase_access_token> → auth middleware → route handler
```

The auth middleware (`middleware/auth.ts`):
1. Extracts Bearer token from `Authorization` header
2. Verifies with Supabase using the service role key
3. On first request: auto-creates a Coach record (upsert pattern)
4. Caches coach lookup for 5 minutes (in-memory)
5. Injects `req.user = { id, email }` for downstream handlers

## Middleware Stack

Applied in this order in `src/index.ts`:

| Middleware | Purpose |
|-----------|---------|
| `helmet()` | Security headers |
| `cors()` | CORS — `/p/*` allows any origin; others restricted to `WEB_URL` + `PREVIEW_URL` |
| `express.raw()` | For Stripe webhook routes (mounted before `express.json()`) |
| `express.json()` | JSON body parsing with rawBody capture for Meta webhook HMAC |
| `express.urlencoded()` | URL-encoded body parsing |
| `rateLimit` (general) | 100 req/min for most routes |
| `rateLimit` (strict) | 10 req/min for `/intake` and `/p/*` (public endpoints) |
| `rateLimit` (webhook) | 200 req/min for `/webhooks` and `/telegram/webhook` |

### Route-Level Middleware

| Middleware | Import | Usage |
|-----------|--------|-------|
| `authenticate` | `middleware/auth.ts` | Verifies Supabase JWT, injects `req.user` |
| `requireTier(...tiers)` | `middleware/subscription.ts` | Ensures coach has one of the specified subscription tiers |
| `enforceLimit(resource)` | `middleware/subscription.ts` | Checks tier resource limits (clients, plans, mealPlans, offers) |
| `requirePlatformAdmin` | `middleware/admin.ts` | Checks coach ID is in `PLATFORM_ADMIN_IDS` env var |
| `validate(schema)` | `middleware/validate.ts` | Validates `req.body` against a Zod schema |

## API Routes Summary

| Base Path | Route File | Auth | Description |
|-----------|-----------|------|-------------|
| `/clients` | clients.ts | Yes | Client CRUD, intake dispatch, risk score |
| `/clients/:id/assignments` | assignments.ts | Yes | Workout plan assignments |
| `/clients/:id/meal-assignments` | meal-assignments.ts | Yes | Meal plan assignments |
| `/coaches` | coaches.ts | Yes | Profile, onboarding, Stripe Connect, channels |
| `/plans` | plans.ts | Yes | Workout plan CRUD, AI generation, templates |
| `/meal-plans` | meal-plans.ts | Yes | Meal plan CRUD, AI generation, templates |
| `/meals` | meals.ts | Yes | Meal database search and creation |
| `/exercises` | exercises.ts | Yes | Local + YMove + unified exercise search |
| `/messages` | messages.ts | Yes | Conversations, send, window status |
| `/payments` | payments.ts | Yes | Checkout, bank transfer, reminders, receipts |
| `/subscriptions` | subscriptions.ts | Yes | Tiers, status, checkout, portal, invoices |
| `/leads` | leads.ts | Yes | Lead CRUD, conversion, intake, messaging |
| `/offers` | offers.ts | Yes | Marketing offer CRUD |
| `/analytics` | analytics.ts | Yes | Summary KPIs, event log |
| `/admin` | admin.ts | Admin | Platform admin dashboard |
| `/nutrition` | nutrition.ts | Yes | Spoonacular ingredient/recipe search |
| `/coach-exercises` | coach-exercises.ts | Yes | Natural language exercise commands |
| `/short-links` | short-links.ts | Yes | URL shortener CRUD |
| `/flows` | flows.ts | Admin | WhatsApp Flow management |
| `/meta-templates` | meta-templates.ts | Yes | WhatsApp template registration |
| `/intake` | intake.ts | No | Public intake form submission |
| `/p` | public.ts | No | Public coach profiles, offers, analytics |
| `/go/:code` | index.ts | No | Short link redirect |
| `/webhooks` | webhooks.ts | Signature | WhatsApp inbound |
| `/telegram/webhook` | telegram-webhook.ts | Signature | Telegram inbound |
| `/payments/webhook` | payment-webhook.ts | Signature | Stripe payment events |
| `/subscriptions/webhook` | subscription-webhook.ts | Signature | Stripe subscription events |
| `/health` | index.ts | No | Health check |
| `/docs` | index.ts | No | Swagger UI |

## Background Jobs

### Queues (8)

| Queue Name | Purpose |
|-----------|---------|
| `workout-delivery` | Daily workout messages |
| `meal-delivery` | Daily meal plan messages |
| `checkin-reminders` | Weekly check-in prompts |
| `onboarding-intake` | Post-payment onboarding flow |
| `renewal-reminders` | Subscription expiry alerts |
| `engagement` | At-risk detection, milestones, summaries |
| `message-processing` | Inbound message keyword/command handling |
| `risk-scoring` | AI risk score computation |

### Feature Flags

Background jobs can be toggled via environment variables:

```env
ENABLE_BACKGROUND_JOBS=true   # Master switch (default: true)
ENABLE_WORKERS=true            # Override: just workers
ENABLE_SCHEDULERS=true         # Override: just schedulers
```

## Database

```bash
pnpm --filter @fitflow/api prisma:generate   # Generate Prisma client from schema
pnpm --filter @fitflow/api prisma:migrate    # Create and run migrations
pnpm --filter @fitflow/api prisma:studio     # Open Prisma Studio GUI
```

Schema: `prisma/schema.prisma` — 22 models, 12 enums. See [ARCHITECTURE.md](../../documentations/ARCHITECTURE.md#data-model) for the full data model.

## Testing

```bash
pnpm --filter @fitflow/api test              # Run all tests
pnpm --filter @fitflow/api test:watch        # Watch mode
pnpm --filter @fitflow/api test:coverage     # With coverage
```

Test files are colocated with source in `__tests__/` directories:

| Directory | What it tests |
|-----------|--------------|
| `middleware/__tests__/` | Auth, subscription middleware |
| `lib/__tests__/` | Background jobs, timezone utils |
| `lib/templates/__tests__/` | Template registry, rendering, escaping |
| `lib/channels/__tests__/` | Channel routing |
| `routes/__tests__/` | Webhooks, payments, subscriptions |

Testing tools: Vitest, Supertest, custom factories and mocks in `__tests__/factories/`, `__tests__/mocks/`.

## API Documentation

The API is documented with an OpenAPI 3.0 specification:

- **Swagger UI**: `http://localhost:3001/docs` (when running)
- **Spec file**: `openapi.json` (86 paths, 70 schemas)

### Regenerating the spec

```bash
pnpm --filter @fitflow/api docs:generate
```

This reads the route registry from `src/docs/openapi.ts` and writes `openapi.json`. Run this after adding or changing routes.
