# FitFlow Full MVP Plan — 4-Layer WhatsApp-Native Trainer CRM

## Goal

Scaffold and build the complete FitFlow MVP: a Next.js trainer dashboard connected to a Node.js/Express API backend, a Supabase PostgreSQL database with Row-Level Security, Twilio WhatsApp Business API + WhatsApp Flows for client interaction, BullMQ for scheduled message delivery, and Stripe Connect for in-chat payments. Each phase is independently deployable and verifiable before the next begins.

---

## Assumptions

- Project is greenfield (only `fitflow-architecture.jsx` exists as reference)
- Developer has: Node.js 20+, pnpm, a Supabase account, a Twilio account with WhatsApp sandbox, a Stripe account, and a Vercel + Railway account (or equivalent)
- Next.js 14 (App Router) for the dashboard frontend
- Monorepo structure: `/apps/web` (Next.js dashboard) + `/apps/api` (Express + BullMQ backend)
- TypeScript throughout
- Prisma ORM over Supabase PostgreSQL
- Shadcn/ui + Tailwind for UI components
- Environment variables managed via `.env.local` (web) and `.env` (api) — never committed

---

## Plan

---

### Phase 0 — Project Scaffolding

#### Step 0.1 — Initialise monorepo
**Files:** `/package.json`, `/pnpm-workspace.yaml`, `/.gitignore`, `/turbo.json`
**Change:** Init pnpm workspace with two apps (`web`, `api`) and one shared package (`/packages/shared` for types/schemas). Configure Turborepo for parallel builds.
**Verify:**
```bash
pnpm install
pnpm turbo run build --dry
# Should list web and api packages without errors
```

#### Step 0.2 — Scaffold Next.js dashboard (`apps/web`)
**Files:** `apps/web/` (full Next.js 14 App Router scaffold)
**Change:** `pnpm create next-app@latest apps/web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`. Install Shadcn/ui, Recharts, Lucide Icons.
**Verify:**
```bash
cd apps/web && pnpm dev
# http://localhost:3000 renders default Next.js page without errors
```

#### Step 0.3 — Scaffold Express API (`apps/api`)
**Files:** `apps/api/src/index.ts`, `apps/api/package.json`, `apps/api/tsconfig.json`
**Change:** Init Node.js + Express + TypeScript. Install: `express`, `cors`, `helmet`, `dotenv`, `bullmq`, `ioredis`, `prisma`, `@prisma/client`, `twilio`, `stripe`, `zod`.
**Verify:**
```bash
cd apps/api && pnpm dev
# curl http://localhost:3001/health → { "status": "ok" }
```

---

### Phase 1 — Database & Auth Foundation

#### Step 1.1 — Supabase project + Prisma schema
**Files:** `apps/api/prisma/schema.prisma`
**Change:** Define models: `Trainer`, `Client`, `WorkoutPlan`, `Exercise`, `CheckIn`, `Payment`, `MessageTemplate`. Enable Row-Level Security policies per trainer. Use Supabase connection string in `DATABASE_URL`.
**Verify:**
```bash
cd apps/api && pnpm prisma migrate dev --name init
pnpm prisma studio
# All tables visible in Prisma Studio. Trainer A cannot query Trainer B's clients (test via SQL in Supabase dashboard).
```

#### Step 1.2 — Supabase Auth + trainer registration/login
**Files:** `apps/web/src/app/(auth)/login/page.tsx`, `apps/web/src/app/(auth)/register/page.tsx`, `apps/web/src/app/lib/supabase.ts`
**Change:** Implement email/password auth using Supabase Auth client. On login, store JWT in httpOnly cookie. Protect all dashboard routes with middleware.
**Verify:**
```bash
# In browser: register new trainer → redirected to /dashboard
# In browser: logout → redirected to /login
# In browser: access /dashboard without session → redirect to /login
# In Supabase auth dashboard: new user row visible
```

#### Step 1.3 — Client management CRUD
**Files:** `apps/api/src/routes/clients.ts`, `apps/web/src/app/dashboard/clients/page.tsx`, `apps/web/src/app/dashboard/clients/[id]/page.tsx`
**Change:** REST endpoints: `GET /clients`, `POST /clients`, `PATCH /clients/:id`, `DELETE /clients/:id`. Dashboard: client list with search, individual client profile page with notes + goals fields.
**Verify:**
```bash
# API: curl -X POST http://localhost:3001/clients -d '{"name":"Test Client","phone":"+447700000000","email":"test@test.com"}' -H "Authorization: Bearer $TOKEN"
# → 201 with client object
# UI: Add client via form → appears in list → click → profile page renders
```

---

### Phase 2 — Workout Plan Builder

#### Step 2.1 — Exercise library + plan data model
**Files:** `apps/api/prisma/schema.prisma` (update), `apps/api/src/routes/exercises.ts`, `apps/api/src/routes/plans.ts`
**Change:** Add `Exercise` (name, category, demo_video_url, muscles) and `WorkoutPlan` (title, trainer_id, template flag, days array with exercise sets/reps/rest). Seed 50 common exercises.
**Verify:**
```bash
pnpm prisma migrate dev --name workout-plans
curl http://localhost:3001/exercises?category=push → list of push exercises
```

#### Step 2.2 — Plan builder UI
**Files:** `apps/web/src/app/dashboard/plans/new/page.tsx`, `apps/web/src/components/PlanBuilder.tsx`
**Change:** Drag-and-drop week/day grid. Exercise search + add. Set/rep/rest inputs per exercise. Save as template toggle. Preview mode shows rendered plan as it would appear in WhatsApp message.
**Verify:**
```bash
# UI: Create a plan "Week 1 PPL" with 3 days → save → redirected to /dashboard/plans
# API: GET /plans → new plan in JSON with correct day/exercise structure
```

#### Step 2.3 — Assign plan to client
**Files:** `apps/api/src/routes/assignments.ts`, `apps/web/src/app/dashboard/clients/[id]/page.tsx` (update)
**Change:** `POST /clients/:id/plans` assigns a plan with a `start_date` and `schedule_days` (e.g. Mon/Wed/Fri). UI: dropdown on client profile to assign plan with start date picker.
**Verify:**
```bash
# Assign plan to client → GET /clients/:id/assignments → plan + schedule_days returned
```

---

### Phase 3 — WhatsApp Integration (Twilio BSP)

#### Step 3.1 — Twilio credentials + sandbox setup
**Files:** `apps/api/.env`, `apps/api/src/lib/twilio.ts`
**Change:** Initialise Twilio client with `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`. Implement `sendMessage(to, body)` and `sendTemplate(to, templateSid, vars)` helpers.
**Verify:**
```bash
# In Twilio sandbox: send test message to your own WhatsApp number
node -e "require('./src/lib/twilio').sendMessage('whatsapp:+447700000000', 'FitFlow test ✓')"
# → message appears on your WhatsApp
```

#### Step 3.2 — Inbound webhook processor
**Files:** `apps/api/src/routes/webhooks/whatsapp.ts`
**Change:** `POST /webhooks/whatsapp` — validates Twilio signature, parses inbound message type (text, button reply, Flow completion), routes to event bus. Idempotent: check `MessageSid` against Redis before processing. Return 200 immediately, process async.
**Verify:**
```bash
# Use Twilio webhook test tool or ngrok to expose local port
# Send "hello" from WhatsApp sandbox → console shows parsed event
# Send same MessageSid twice → second event dropped (Redis dedup check)
```

#### Step 3.3 — WhatsApp Flow: weekly check-in (5 screens)
**Files:** `apps/api/src/flows/weekly-checkin.json`, `apps/api/src/routes/flows.ts`
**Change:** Build WhatsApp Flow JSON — Screen 1: weight input; Screen 2: energy 1–5 buttons; Screen 3: sleep dropdown; Screen 4: optional pain notes; Screen 5: photo prompt + submit. Register with Twilio/Meta Flows API. Handle `FlowComplete` webhook event → parse responses → upsert `CheckIn` record in DB.
**Verify:**
```bash
# Trigger check-in Flow to your test WhatsApp number
# Complete all 5 screens
# GET /clients/:id/checkins → new check-in record with weight/energy/sleep/notes
```

#### Step 3.4 — Workout delivery via WhatsApp
**Files:** `apps/api/src/services/workout-delivery.ts`
**Change:** Given a `client_id` and `plan_day`, build rich WhatsApp message: header (day/workout name), body (exercise list with sets/reps), footer (video link if available), reply buttons: "Done ✓" / "Modified" / "Skipped". Handle button reply → update `WorkoutLog` in DB.
**Verify:**
```bash
# Trigger delivery manually: POST /debug/deliver-workout { client_id, plan_day: 1 }
# → WhatsApp message appears with correct exercises and reply buttons
# Tap "Done ✓" on workout → GET /clients/:id/workout-logs → session marked complete
```

---

### Phase 4 — Scheduling & Automation (BullMQ)

#### Step 4.1 — Redis + BullMQ setup
**Files:** `apps/api/src/lib/queue.ts`, `apps/api/src/workers/index.ts`
**Change:** Connect BullMQ to Redis (Upstash or Railway Redis). Define queues: `workout-delivery`, `checkin-reminders`, `payment-reminders`, `re-engagement`. Implement worker process with concurrency 5.
**Verify:**
```bash
pnpm worker:start
# BullBoard UI at http://localhost:3002 shows empty queues, workers active
```

#### Step 4.2 — Timezone-aware workout delivery scheduler
**Files:** `apps/api/src/jobs/schedule-workouts.ts`
**Change:** Daily cron at 00:01 UTC — query all active client assignments for current day. For each client, compute "7AM in client timezone" → enqueue `workout-delivery` job with `delay` to that timestamp. Use `date-fns-tz` for timezone math.
**Verify:**
```bash
# Seed a client with timezone "Europe/London", plan day set for today
# Run scheduler manually: node src/jobs/schedule-workouts.ts
# BullBoard: job appears in workout-delivery queue with correct delay (time until 7AM London)
```

#### Step 4.3 — Weekly check-in reminder scheduler
**Files:** `apps/api/src/jobs/schedule-checkins.ts`
**Change:** Weekly cron (Sunday 8PM client timezone) — enqueue `checkin-reminder` job. Job sends WhatsApp template "Your weekly check-in is ready 📊" with Flow trigger button. Skip if client already has a check-in for this week (idempotency check).
**Verify:**
```bash
# Manually trigger reminder job for test client
# → WhatsApp template message received with Flow trigger button
# Trigger again for same client same week → no duplicate message sent
```

#### Step 4.4 — Onboarding automation state machine
**Files:** `apps/api/src/services/onboarding.ts`
**Change:** Event: `payment.succeeded` → (1) create client record, (2) enqueue intake Flow (name/goals/timezone/injuries), (3) on FlowComplete: populate CRM, assign default plan, schedule first workout delivery. Whole pipeline fires without trainer input. Map states: `PENDING_PAYMENT → INTAKE_SENT → INTAKE_COMPLETE → PLAN_ASSIGNED → ACTIVE`.
**Verify:**
```bash
# Simulate payment.succeeded webhook: POST /webhooks/stripe { type: "payment_intent.succeeded", ... }
# Watch logs: client created → intake Flow sent → complete intake → plan assigned
# GET /clients/:id → status: "ACTIVE", plan assigned, first workout scheduled
```

---

### Phase 5 — Stripe Connect Payments

#### Step 5.1 — Stripe Connect onboarding for trainers
**Files:** `apps/api/src/routes/stripe.ts`, `apps/web/src/app/dashboard/settings/billing/page.tsx`
**Change:** `POST /stripe/connect` → creates Stripe Connect Express account → returns onboarding URL. Trainer redirected to Stripe onboarding, then back to `/dashboard/settings/billing?connected=true`. Store `stripe_account_id` on `Trainer` model.
**Verify:**
```bash
# Click "Connect Stripe" in dashboard settings → Stripe onboarding opens
# Complete Stripe test onboarding → redirect back to dashboard
# GET /trainers/me → stripe_account_id populated
```

#### Step 5.2 — Payment link generation + in-chat delivery
**Files:** `apps/api/src/services/payments.ts`
**Change:** `POST /clients/:id/payment-links` → creates Stripe Payment Link on trainer's connected account. Charge amount in trainer's currency. Platform fee: 5% via `application_fee_amount`. Send link in WhatsApp message to client. Store `Payment` record with `status: PENDING`.
**Verify:**
```bash
# Create payment link for client → WhatsApp message with Stripe link received
# Click link in WhatsApp → Stripe checkout opens in browser
# GET /clients/:id/payments → payment record with status PENDING
```

#### Step 5.3 — Payment webhook + client activation
**Files:** `apps/api/src/routes/webhooks/stripe.ts`
**Change:** Handle `checkout.session.completed` → update `Payment` status to `SUCCEEDED` → trigger onboarding pipeline (Step 4.4). Handle `payment_intent.payment_failed` → send retry message to client via WhatsApp. Verify Stripe webhook signature on every request.
**Verify:**
```bash
stripe listen --forward-to localhost:3001/webhooks/stripe
stripe trigger checkout.session.completed
# → Payment updated to SUCCEEDED in DB
# → Onboarding pipeline fires (intake Flow sent to WhatsApp)
```

---

### Phase 6 — Progress Dashboard (Trainer UI)

#### Step 6.1 — Client overview dashboard
**Files:** `apps/web/src/app/dashboard/page.tsx`, `apps/web/src/components/ClientStatusGrid.tsx`
**Change:** Grid of client cards showing: name, current week compliance %, last check-in date, plan day, payment status. Color-coded status (green=active, amber=late check-in, red=payment overdue). Click → client profile.
**Verify:**
```bash
# Seed 5 test clients with varying statuses
# Dashboard shows all 5 with correct compliance % and payment status
# Mobile (375px viewport): cards stack cleanly, no horizontal overflow
```

#### Step 6.2 — Individual client progress charts
**Files:** `apps/web/src/app/dashboard/clients/[id]/page.tsx` (update), `apps/web/src/components/charts/WeightChart.tsx`, `apps/web/src/components/charts/ComplianceChart.tsx`
**Change:** Recharts line chart for weight trend (from check-ins). Bar chart for weekly compliance (workouts completed / total scheduled). Energy + sleep trend badges. Photo timeline (thumbnails from Supabase Storage signed URLs). All charts responsive.
**Verify:**
```bash
# Seed 8 weeks of check-in data for one client
# Weight chart renders correctly with correct x-axis dates
# Resize browser to 375px → charts reflow without breaking
```

#### Step 6.3 — Automated re-engagement alerts
**Files:** `apps/api/src/jobs/re-engagement.ts`, `apps/web/src/components/AlertBanner.tsx`
**Change:** Daily cron: flag clients with 0 workouts logged in 7 days OR no check-in in 14 days. Surface on dashboard as amber/red alert cards. Enqueue re-engagement WhatsApp message (requires template pre-approval): "Hey [name], we haven't heard from you — how's it going? 💪".
**Verify:**
```bash
# Seed client with last_checkin = 15 days ago
# Run re-engagement job: node src/jobs/re-engagement.ts
# Dashboard shows alert banner for that client
# WhatsApp re-engagement message sent to test number
```

---

### Phase 7 — Deployment

#### Step 7.1 — Vercel deployment (web dashboard)
**Files:** `apps/web/vercel.json`, `.env.production`
**Change:** Deploy Next.js app to Vercel. Set all env vars (Supabase URL/key, API URL, Stripe publishable key). Configure custom domain. Verify SSR + edge middleware works in production.
**Verify:**
```bash
vercel --prod
# https://app.fitflow.co loads login page
# Login with test trainer credentials → dashboard renders
# No console errors; no env vars exposed client-side
```

#### Step 7.2 — Railway deployment (API + workers)
**Files:** `apps/api/railway.toml`, `apps/api/Dockerfile`
**Change:** Deploy Express API + BullMQ workers as two Railway services sharing one Redis instance. Configure environment variables and health check endpoint. Set `RAILWAY_STATIC_URL` for webhook base URL. Register production webhook URL with Twilio + Stripe.
**Verify:**
```bash
curl https://api.fitflow.co/health → { "status": "ok", "redis": "connected" }
# BullBoard accessible (basic-auth protected) at https://api.fitflow.co/queues
# Twilio sends test message via production webhook → logged in Railway
```

#### Step 7.3 — End-to-end smoke test (production)
**Files:** N/A
**Change:** Run full happy path on production environment.
**Verify:**
```bash
# 1. Register new trainer account → verify email → login
# 2. Connect Stripe account
# 3. Add test client with real phone number
# 4. Assign workout plan with today as start day
# 5. Send payment link → complete Stripe test payment
# 6. Verify onboarding Flow arrives on WhatsApp
# 7. Complete intake Flow → verify client CRM populated
# 8. Wait for (or manually trigger) workout delivery → verify WhatsApp message
# 9. Tap "Done ✓" on workout → verify log appears in dashboard
# 10. Trigger weekly check-in → complete 5-screen Flow → verify dashboard charts update
```

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Twilio sandbox ≠ production API behaviour | Use sandbox for dev, apply for production WhatsApp Business API access in Week 1 — approval takes 1–5 business days |
| WhatsApp Flow JSON schema strict validation | Build and test Flow JSON in   before integrating — iterate schema there, not in code |
| Meta rejects template messages | Pre-write 10 templates and submit in Week 1. Use generic language (not branded/promotional) — approval rates are higher for service/utility templates |
| Stripe Connect onboarding in test mode differs from live | Complete full Connect Express onboarding in test mode early; identify any friction before coaching real clients |
| BullMQ jobs lost on Railway restart | Use persistent Redis (Railway managed Redis with `appendonly yes`). Configure BullMQ `removeOnComplete: false` for 7-day retention |
| RLS misconfiguration leaks cross-trainer data | Write explicit SQL test in Supabase: log in as Trainer A, attempt `SELECT * FROM clients` — should return only Trainer A's clients |
| Scope expansion during build | Strictly enforce Phase 0–7 sequence. No Phase 8 features (nutrition, video library, AI) until smoke test passes |

---

## Rollback Plan

- **Database migrations:** All Prisma migrations are versioned. Rollback with `prisma migrate resolve --rolled-back <migration_name>`. Never use `prisma db push` in production.
- **API deployments:** Railway maintains deployment history. Roll back to previous commit from Railway dashboard in <2 min.
- **Web deployments:** Vercel maintains full deployment history. Instant rollback via Vercel dashboard.
- **WhatsApp Flows:** Keep previous Flow JSON versions in `apps/api/src/flows/archive/`. If Flows API is broken, fall back to rich-message format (buttons + free text) without Flows.
- **Stripe Connect:** Cannot be automatically rolled back — Stripe transactions are permanent. Test all payment scenarios in Stripe test mode before going live.
- **Queue jobs:** BullMQ jobs can be manually replayed from BullBoard UI if a worker crashes mid-processing.
