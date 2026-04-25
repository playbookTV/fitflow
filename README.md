# FitFlow

A coaching operations platform for online personal trainers. Coaches manage clients, deliver workout and meal plans, collect check-ins, and process payments — all through WhatsApp or Telegram, without asking clients to download another app.

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌───────────────────┐
│  Coach Dashboard │     │   Express API     │     │   Background      │
│  (Next.js 14)   │────▶│   + Prisma ORM    │────▶│   Workers (BullMQ)│
│  Vercel          │     │   Railway         │     │   Redis-backed    │
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

## Monorepo Structure

```
fitflow/
├── apps/
│   ├── api/              Express.js backend (REST API, webhooks, BullMQ workers)
│   ├── web/              Next.js 14 coach dashboard (App Router, Tailwind, Radix UI)
│   └── marketing/        Marketing site
├── packages/
│   └── shared/           Shared TypeScript types, channel interfaces, template definitions
├── documentations/       Architecture docs, product specs, integration guides
├── turbo.json            Turborepo task configuration
├── pnpm-workspace.yaml   Workspace definitions
└── railway.toml          Railway deployment configuration
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14 (App Router) | Coach dashboard |
| UI | Radix UI + Tailwind CSS + Framer Motion | Accessible, mobile-first, animated components |
| Backend | Express.js | REST API + webhook handlers |
| ORM | Prisma | Type-safe PostgreSQL access (22 models) |
| Database | PostgreSQL (Supabase) | Primary data store + auth |
| Job Queue | BullMQ + Redis | 8 queues, 9 schedulers, 4 workers |
| Payments | Stripe Connect | Coach-as-merchant payments + SaaS subscriptions |
| WhatsApp | Meta Cloud API | Messaging + Flows (structured forms) |
| Telegram | Telegram Bot API | Shared bot with coach branding |
| AI | Anthropic Claude | Workout/meal plan generation, risk scoring |
| Exercise Videos | YMove API | On-demand exercise demo URLs |
| Nutrition | Spoonacular API | Ingredient/recipe search with macros |

## Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0
- **PostgreSQL** (via Supabase or local)
- **Redis** (for BullMQ job queue)

## Quick Start

```bash
# Clone and install
git clone <repo-url> fitflow
cd fitflow
pnpm install

# Configure environment
cp apps/api/.env.example apps/api/.env       # Edit with your credentials
cp apps/web/.env.example apps/web/.env.local  # Edit with your credentials

# Set up database
pnpm --filter @fitflow/api prisma:generate   # Generate Prisma client
pnpm --filter @fitflow/api prisma:migrate    # Run migrations

# Start development
pnpm turbo dev                                # Runs all apps concurrently
```

The dashboard will be at `http://localhost:3000` and the API at `http://localhost:3001`.

## Development Commands

| Command | Description |
|---------|-------------|
| `pnpm turbo dev` | Run all apps in development (hot reload) |
| `pnpm turbo build` | Build all packages (respects dependency graph) |
| `pnpm turbo type-check` | TypeScript type checking |
| `pnpm turbo lint` | Run linters |
| `pnpm turbo test` | Run all test suites |
| `pnpm --filter @fitflow/web dev` | Run only the Next.js dashboard |
| `pnpm --filter @fitflow/api dev` | Run only the Express API |
| `pnpm --filter @fitflow/api prisma:studio` | Open Prisma Studio (database GUI) |
| `pnpm --filter @fitflow/api prisma:migrate` | Run database migrations |
| `pnpm --filter @fitflow/api worker:start` | Start BullMQ worker separately |
| `pnpm --filter @fitflow/api docs:generate` | Regenerate OpenAPI spec |

## API Documentation

The API is fully documented with an OpenAPI 3.0 specification covering all 86 endpoints.

- **Interactive Swagger UI**: Start the API and visit `http://localhost:3001/docs`
- **OpenAPI Spec**: `apps/api/openapi.json` (committed, regenerate with `pnpm docs:generate`)

## Key Features

- **Client Management** — Full lifecycle from lead capture to active coaching
- **Workout Plan Builder** — Visual editor with drag-and-drop, plus AI generation via Claude
- **Meal Plan Builder** — Nutrition-aware plans with Spoonacular integration
- **Multi-Channel Delivery** — WhatsApp + Telegram through a unified channel abstraction
- **Stripe Payments** — Coaches as Stripe Connect merchants, with bank transfer fallback
- **Subscription Tiers** — STARTER / PRO / STUDIO with feature gates and resource limits
- **Lead Funnel** — Offers, landing pages, intake forms, lead-to-client conversion
- **AI Risk Scoring** — Proactive churn detection with actionable suggestions
- **Public Coach Profiles** — Landing pages at ftfw.fit with analytics tracking
- **Background Automation** — Timezone-aware workout/meal delivery, check-in reminders, engagement alerts
- **Admin Dashboard** — Platform-wide analytics, coach management, revenue tracking

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](documentations/ARCHITECTURE.md) | System design, data model, patterns, ADRs |
| [Deployment](DEPLOYMENT.md) | Environment setup, webhook configuration, CI/CD |
| [API README](apps/api/README.md) | Backend setup, routes, middleware, background jobs |
| [Web README](apps/web/README.md) | Frontend setup, pages, design system |
| [Shared README](packages/shared/README.md) | Shared types, channel interface, templates |
| [PRD v2](documentations/FitFlow_PRD_v2.md) | Product requirements document |
| [Onboarding Spec](documentations/FITFLOW_TRAINER_ONBOARDING_SPEC.md) | Coach onboarding flow |
| [Vanity URL Spec](documentations/FTFW_FIT_VANITY_URL_SPEC.md) | ftfw.fit implementation |
| [YMove Integration](documentations/fitflow-ymove-exercise-integration.md) | Exercise video API |
