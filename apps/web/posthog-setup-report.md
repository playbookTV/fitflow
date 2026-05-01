<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the FitFlow Next.js App Router project. Here's a summary of what was set up:

**Infrastructure:**
- Created `src/app/providers.tsx` — a `PostHogProvider` client component that initializes `posthog-js` with the EU host, reverse proxy, error tracking (`capture_exceptions`), and the `2026-01-30` defaults snapshot.
- Wrapped the root layout (`src/app/layout.tsx`) with `PostHogProvider`.
- Created `src/lib/posthog-server.ts` — a singleton server-side PostHog client using `posthog-node` for any future server-side event captures.
- Updated `next.config.mjs` — added `/ingest/*` rewrites to route PostHog traffic through a reverse proxy, improving reliability against ad-blockers. Also set `skipTrailingSlashRedirect: true` as required.
- Added `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` to `.env.local`.
- Added `posthog-js` and `posthog-node` to `package.json`. **Run `pnpm install` from the repo root to complete installation.**

**User Identification:**
- On **login** (`src/app/(auth)/login/page.tsx`): calls `posthog.identify(email, { email })` to link the anonymous session to the coach's email before navigating.
- On **registration** (`src/app/(auth)/register/page.tsx`): calls `posthog.identify(email, { email, name })` immediately on successful signup.

**Error Tracking:**
- Auth errors (login failures, registration errors) are captured with `posthog.captureException`.
- Subscription checkout and plan change errors are also tracked.
- Onboarding intake submission errors are captured.

## Events Instrumented

| Event | Description | File |
|---|---|---|
| `coach_signed_up` | Coach submits registration form successfully (email verification sent) | `src/app/(auth)/register/page.tsx` |
| `coach_logged_in` | Coach successfully authenticates via email/password | `src/app/(auth)/login/page.tsx` |
| `coach_setup_completed` | Coach completes the initial setup wizard | `src/app/setup/page.tsx` |
| `client_created` | Coach creates a new client, with `initial_status` and `send_intake` properties | `src/app/dashboard/clients/new/page.tsx` |
| `plan_creation_started` | Coach begins creating a workout plan, with `mode` (scratch) | `src/app/dashboard/plans/new/page.tsx` |
| `subscription_checkout_started` | Coach initiates Stripe checkout for a new subscription, with `tier` and `billing_interval` | `src/components/PricingTiers.tsx` |
| `subscription_plan_changed` | Existing subscriber changes their plan tier, with `new_tier`, `previous_tier`, `billing_interval` | `src/components/PricingTiers.tsx` |
| `billing_portal_opened` | Coach opens the Stripe billing portal, with `current_tier` | `src/app/dashboard/subscription/page.tsx` |
| `client_intake_submitted` | Client submits the onboarding intake form, with `client_id` | `src/app/onboarding/page.tsx` |
| `offer_link_copied` | Coach copies their public offer URL, with `offer_id` and `offer_slug` | `src/app/dashboard/offers/[id]/page.tsx` |
| `client_plan_assigned` | Coach assigns a workout plan to a client, with `client_id`, `plan_id`, `plan_title`, `schedule_days` | `src/app/dashboard/clients/[id]/page.tsx` |

## Next steps

We've built a dashboard and 5 insights to keep an eye on user behavior based on the events just instrumented:

**Dashboard:**
- [Analytics basics](https://eu.posthog.com/project/170181/dashboard/654678)

**Insights:**
- [Coach Signup → Setup Completion Funnel](https://eu.posthog.com/project/170181/insights/pCZXV9ud) — Measures how many new coaches complete setup after signing up
- [Subscription Checkout Started (Daily)](https://eu.posthog.com/project/170181/insights/ZixRFTi5) — Tracks daily subscription checkout intent
- [Client Intake Completion Funnel](https://eu.posthog.com/project/170181/insights/4B0Agyy7) — Shows drop-off between client creation and intake form submission
- [New Clients Added (Weekly)](https://eu.posthog.com/project/170181/insights/9IuU8HNJ) — Weekly growth of client roster across all coaches
- [Signup → First Client → Checkout Funnel](https://eu.posthog.com/project/170181/insights/PNXbBI1z) — Full acquisition-to-monetization funnel

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
