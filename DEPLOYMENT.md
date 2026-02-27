# FitFlow — Deployment Guide

This guide outlines the steps to deploy the FitFlow monorepo to production.

## 🚀 Recommended Stack
- **Dashboard (Frontend)**: [Vercel](https://vercel.com)
- **API & Workers**: [Railway](https://railway.app) or [Render](https://render.com)
- **Database & Auth**: [Supabase](https://supabase.com)
- **Task Queue**: [Upstash Redis](https://upstash.com/redis)

## 🔑 Environment Variables

### `apps/web` (Vercel)
| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key |
| `NEXT_PUBLIC_API_URL` | URL of your deployed Express API |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Test/Live Publishable Key |

### `apps/api` (Railway/Render)
| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Supabase Connection String (Transaction mode) |
| `DIRECT_URL` | Supabase Connection String (Direct mode) |
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_SERVICE_KEY` | Supabase Service Role Key |
| `META_WHATSAPP_ACCESS_TOKEN` | Meta Access Token |
| `META_WHATSAPP_PHONE_NUMBER_ID` | Meta Phone Number ID |
| `META_WHATSAPP_BUSINESS_ACCOUNT_ID` | Meta Business Account ID |
| `META_WHATSAPP_VERIFY_TOKEN` | Custom Verify Token for Webhooks |
| `STRIPE_SECRET_KEY` | Stripe Secret Key |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook Secret |
| `REDIS_URL` | Redis Connection URL (for BullMQ) |
| `JWT_SECRET` | Random string for additional security (optional) |

## 🛠️ Deployment Steps

### 1. Database
- Push your schema to Supabase:
```bash
cd apps/api
pnpm prisma db push
```

### 2. API & Workers
- Connect your GitHub repo to Railway/Render.
- Set the Root Directory to `apps/api`.
- Ensure the build command is `pnpm install && pnpm prisma generate && pnpm build`.
- Ensure the start command is `pnpm start`.

### 3. Dashboard
- Connect your GitHub repo to Vercel.
- Vercel will automatically detect the Next.js app in `apps/web`.
- Configure the environment variables.

### 4. Webhooks
- **Stripe**: Point to `https://your-api.com/payments/webhook`.
- **Meta Webhook**: Point to `https://your-api.com/whatsapp/webhook`.
