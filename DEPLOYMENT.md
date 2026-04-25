# FitFlow — Deployment Guide

> Last updated: April 25, 2026

This guide covers everything needed to deploy the FitFlow monorepo to production.

---

## Recommended Stack

| Component | Provider | Purpose |
|-----------|----------|---------|
| Dashboard (Frontend) | [Vercel](https://vercel.com) | Next.js SSR + static hosting |
| API & Workers | [Railway](https://railway.app) or [Render](https://render.com) | Express server + BullMQ workers |
| Database & Auth | [Supabase](https://supabase.com) | Managed PostgreSQL + Auth |
| Task Queue | [Upstash Redis](https://upstash.com/redis) or Railway Redis | BullMQ backing store |
| Payments | [Stripe](https://stripe.com) | Payment processing + Connect |

---

## Environment Variables

### `apps/web` (Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (`https://xxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `NEXT_PUBLIC_API_URL` | Yes | URL of deployed Express API (e.g., `https://api.fitflow.io`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes | Stripe publishable key (`pk_live_...` or `pk_test_...`) |

### `apps/api` (Railway/Render)

#### Database & Auth

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Supabase connection string (transaction/pgBouncer mode) |
| `DIRECT_URL` | Yes | Supabase connection string (direct mode, used for migrations) |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key (server-side only, never expose to client) |

#### WhatsApp (Meta Cloud API)

| Variable | Required | Description |
|----------|----------|-------------|
| `META_WHATSAPP_ACCESS_TOKEN` | Yes | Permanent access token from Meta Business |
| `META_WHATSAPP_PHONE_NUMBER_ID` | Yes | WhatsApp Business phone number ID |
| `META_WHATSAPP_BUSINESS_ACCOUNT_ID` | Yes | WhatsApp Business Account ID |
| `META_WHATSAPP_VERIFY_TOKEN` | Yes | Custom string for webhook verification handshake |
| `META_APP_SECRET` | Yes | Meta App Secret (used for webhook signature HMAC-SHA256 verification) |
| `META_WHATSAPP_DISPLAY_NUMBER` | No | Display phone number (for UI display, not API calls) |

#### Telegram

| Variable | Required | Description |
|----------|----------|-------------|
| `DEFAULT_TG_BOT_TOKEN` | Yes | Shared Telegram bot token |
| `TG_WEBHOOK_SECRET` | Yes | Secret token for Telegram webhook verification (`X-Telegram-Bot-Api-Secret-Token` header) |
| `DEFAULT_COACH_ID` | No | Default coach ID for shared bot routing |

#### Stripe

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key (`sk_live_...` or `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Yes | Webhook signing secret for **payment** events (`whsec_...`) |
| `STRIPE_SUBSCRIPTION_WEBHOOK_SECRET` | Yes | Webhook signing secret for **subscription** events (`whsec_...`) — **separate from above** |

**Stripe Price IDs** (12 total — 3 tiers x 2 currencies x 2 intervals):

| Variable | Description |
|----------|-------------|
| `STRIPE_PRICE_STARTER_MONTHLY_USD` | Starter monthly (USD) |
| `STRIPE_PRICE_STARTER_ANNUAL_USD` | Starter annual (USD) |
| `STRIPE_PRICE_PRO_MONTHLY_USD` | Pro monthly (USD) |
| `STRIPE_PRICE_PRO_ANNUAL_USD` | Pro annual (USD) |
| `STRIPE_PRICE_STUDIO_MONTHLY_USD` | Studio monthly (USD) |
| `STRIPE_PRICE_STUDIO_ANNUAL_USD` | Studio annual (USD) |
| `STRIPE_PRICE_STARTER_MONTHLY_GBP` | Starter monthly (GBP) |
| `STRIPE_PRICE_STARTER_ANNUAL_GBP` | Starter annual (GBP) |
| `STRIPE_PRICE_PRO_MONTHLY_GBP` | Pro monthly (GBP) |
| `STRIPE_PRICE_PRO_ANNUAL_GBP` | Pro annual (GBP) |
| `STRIPE_PRICE_STUDIO_MONTHLY_GBP` | Studio monthly (GBP) |
| `STRIPE_PRICE_STUDIO_ANNUAL_GBP` | Studio annual (GBP) |

Generate these with: `pnpm --filter @fitflow/api stripe:seed`

#### AI & External APIs

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude (plan generation, risk scoring) |
| `YMOVE_API_KEY` | No | YMove exercise API key |
| `YMOVE_BASE_URL` | No | YMove API base URL (default: `https://exercise-api.ymove.app/api/v2`) |
| `SPOONACULAR_API_KEY` | No | Spoonacular nutrition API key |

#### Application

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3001` | API server port |
| `NODE_ENV` | No | `development` | Environment (`development`, `production`, `test`) |
| `WEB_URL` | No | `http://localhost:3000` | Frontend URL (used for CORS) |
| `PREVIEW_URL` | No | — | Optional preview/staging frontend URL (added to CORS) |
| `API_BASE_URL` | No | — | Public API URL (used for webhook URL construction) |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection URL for BullMQ |
| `IP_HASH_SALT` | No | — | Salt for hashing visitor IPs in profile analytics |

#### Admin & Feature Flags

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PLATFORM_ADMIN_IDS` | No | `""` | Comma-separated coach UUIDs with admin access |
| `ENABLE_BACKGROUND_JOBS` | No | `true` | Master switch for workers + schedulers |
| `ENABLE_WORKERS` | No | inherits from above | Enable BullMQ job processors |
| `ENABLE_SCHEDULERS` | No | inherits from above | Enable cron-based job schedulers |

---

## Webhook Endpoints

Configure these in the respective service dashboards:

### Stripe Payment Webhook

- **URL**: `https://your-api.com/payments/webhook`
- **Events**: `checkout.session.completed`
- **Secret**: Store as `STRIPE_WEBHOOK_SECRET`
- **Note**: This route uses `express.raw()` — it is mounted **before** `express.json()` in the middleware stack

### Stripe Subscription Webhook

- **URL**: `https://your-api.com/subscriptions/webhook`
- **Events**: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.trial_will_end`
- **Secret**: Store as `STRIPE_SUBSCRIPTION_WEBHOOK_SECRET` (different from payment webhook)
- **Note**: Also uses `express.raw()` — mounted before `express.json()`

### Meta WhatsApp Webhook

- **Verification URL**: `GET https://your-api.com/webhooks`
  - Meta sends `hub.mode=subscribe`, `hub.verify_token`, and `hub.challenge`
  - Must match `META_WHATSAPP_VERIFY_TOKEN`
- **Callback URL**: `POST https://your-api.com/webhooks`
  - Signature verified via `X-Hub-Signature-256` header using `META_APP_SECRET`
- **Subscribed fields**: `messages`

### Telegram Bot Webhook

- **URL**: `https://your-api.com/telegram/webhook`
- **Verification**: `X-Telegram-Bot-Api-Secret-Token` header must match `TG_WEBHOOK_SECRET`
- **Setup**: The bot provisioner (`lib/bot-provisioner.ts`) auto-registers the webhook on server startup via `ensureSharedBot()`
- **Manual setup**: `curl "https://api.telegram.org/bot{TOKEN}/setWebhook?url=https://your-api.com/telegram/webhook&secret_token={TG_WEBHOOK_SECRET}"`

---

## Deployment Steps

### 1. Database (Supabase)

```bash
cd apps/api
pnpm prisma db push     # Push schema to Supabase (or use prisma migrate deploy for production)
pnpm prisma:generate     # Generate Prisma client
tsx prisma/seed.ts       # Seed exercise catalog and templates (optional)
```

### 2. API & Workers (Railway)

The repo includes a `railway.toml` at the root:

```toml
[build]
builder = "nixpacks"
buildCommand = "pnpm install && pnpm --filter @fitflow/shared build && pnpm --filter @fitflow/api build"

[deploy]
startCommand = "pnpm --filter @fitflow/api start"
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "on_failure"
maxRestartAttempts = 5
```

Steps:
1. Connect your GitHub repo to Railway
2. Set all environment variables from the table above
3. Railway auto-detects `railway.toml` and builds accordingly
4. Workers and schedulers run in the same process (controlled by `ENABLE_BACKGROUND_JOBS`)

**Health check**: `GET /health` returns `{ "status": "ok", "timestamp": "..." }`

### 3. Dashboard (Vercel)

1. Connect your GitHub repo to Vercel
2. Set Root Directory to `apps/web`
3. Vercel auto-detects Next.js
4. Configure the 4 environment variables listed above
5. Set the build command: `cd ../.. && pnpm turbo build --filter=@fitflow/web`

### 4. Redis (Upstash or Railway)

BullMQ requires Redis for job queuing. Options:
- **Upstash Redis**: Serverless, pay-per-request. Set `REDIS_URL` to the Upstash connection string.
- **Railway Redis**: Add a Redis service in your Railway project. The internal URL is auto-populated.

### 5. Stripe Connect Setup

For coaches to receive client payments:
1. Enable Stripe Connect in your Stripe Dashboard
2. Set platform type to "Express"
3. Coaches initiate onboarding via `POST /coaches/stripe/connect`
4. Stripe handles KYC and bank account setup

### 6. Webhook Registration

After deploying, register webhooks:
1. **Stripe**: Dashboard → Developers → Webhooks → Add endpoint (see URLs above)
2. **Meta**: App Dashboard → WhatsApp → Configuration → Webhook (see URL above)
3. **Telegram**: Automatic on server startup via `ensureSharedBot()`

---

## Monitoring

- **API Health**: `GET /health` — returns `{ status: "ok" }`
- **API Docs**: `GET /docs` — Swagger UI for API documentation
- **BullMQ Dashboard**: Bull Board is available (if configured) for job queue monitoring
- **Startup Logs**: The API logs which workers and schedulers are active on boot:
  ```
  [Startup] Background workers enabled (workout + engagement + meal + risk-scoring)
  [Startup] Schedulers enabled (9 active)
  ```

---

## CI/CD

GitHub Actions workflow (`.github/workflows/test.yml`) runs on push to `main` and PRs:

| Job | What it tests |
|-----|--------------|
| `test-shared` | `@fitflow/shared` unit tests |
| `test-api` | API tests (requires PostgreSQL 16 + Redis 7 services) |
| `test-web` | Frontend component tests |
| `test-meta-contract` | Meta API integration tests (manual trigger only) |
