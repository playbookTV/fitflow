<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog into the FitFlow API (`apps/api`). Here's a summary of every change made:

- **`src/lib/posthog.ts`** (new) — Singleton PostHog client using `posthog-node` SDK with `enableExceptionAutocapture: true`. Token and host are read from environment variables.
- **`src/lib/event-logger.ts`** — Added PostHog capture alongside the existing DB event log. A whitelist of 20 high-value business events is forwarded to PostHog with the coach's ID as the `distinctId`. Events are mapped from internal dot-notation names to the PostHog `[object] [verb]` convention.
- **`src/middleware/auth.ts`** — Added `posthog.identify()` and a `coach signed up` capture on first coach account creation, so user profiles are created in PostHog on registration.
- **`src/index.ts`** — Added `posthog.captureException(err)` in the Express error handler for automatic error tracking, and `posthog.shutdown()` on `SIGTERM` to flush events cleanly.
- **`package.json`** — Added `posthog-node ^4.4.3` as a dependency (run `pnpm install` to install).
- **`.env`** — Set `POSTHOG_API_KEY` and `POSTHOG_HOST`.
- **`.env.example`** — Documented the two new environment variables.

## Events instrumented

| Event name | Description | File |
|---|---|---|
| `client created` | Coach adds a new client to their roster | `src/lib/event-logger.ts` |
| `client activated` | Client transitions to ACTIVE status | `src/lib/event-logger.ts` |
| `client paused` | Coach pauses a client's coaching | `src/lib/event-logger.ts` |
| `client deactivated` | Client marked inactive | `src/lib/event-logger.ts` |
| `payment confirmed` | Stripe checkout.session.completed webhook fires | `src/lib/event-logger.ts` |
| `bank transfer confirmed` | Coach manually confirms a bank transfer | `src/lib/event-logger.ts` |
| `plan assigned` | Workout plan assigned to a client | `src/lib/event-logger.ts` |
| `workout completed` | Client marks a workout complete | `src/lib/event-logger.ts` |
| `checkin completed` | Client completes a weekly check-in | `src/lib/event-logger.ts` |
| `ai plan generated` | Coach uses AI to generate a workout plan | `src/lib/event-logger.ts` |
| `ai meal plan generated` | Coach uses AI to generate a meal plan | `src/lib/event-logger.ts` |
| `meal plan assigned` | Meal plan assigned to a client | `src/lib/event-logger.ts` |
| `subscription created` | Coach subscribes to a FitFlow plan | `src/lib/event-logger.ts` |
| `subscription upgraded` | Coach upgrades their tier | `src/lib/event-logger.ts` |
| `subscription downgraded` | Coach downgrades their tier | `src/lib/event-logger.ts` |
| `subscription canceled` | Coach cancels their subscription | `src/lib/event-logger.ts` |
| `subscription renewed` | Subscription auto-renews | `src/lib/event-logger.ts` |
| `coach onboarding completed` | Coach completes the onboarding flow | `src/lib/event-logger.ts` |
| `trainer activated` | Coach adds their first client | `src/lib/event-logger.ts` |
| `intake completed` | Client completes their intake form | `src/lib/event-logger.ts` |
| `coach signed up` | New coach account created on first auth | `src/middleware/auth.ts` |

## Next steps

We've built a dashboard and five insights for you to monitor key business metrics:

- **Dashboard**: [Analytics basics](https://eu.posthog.com/project/170181/dashboard/654691)
- [New clients over time](https://eu.posthog.com/project/170181/insights/XgXYERC9) — Weekly new client additions (line chart)
- [Client onboarding funnel](https://eu.posthog.com/project/170181/insights/RlrQdpN5) — client created → payment confirmed → plan assigned → client activated
- [New subscriptions over time](https://eu.posthog.com/project/170181/insights/jW5Oah3j) — Weekly new FitFlow subscription signups (bar chart)
- [AI feature adoption](https://eu.posthog.com/project/170181/insights/iSy9UcQj) — Weekly AI plan and meal plan generation usage
- [Client churn events](https://eu.posthog.com/project/170181/insights/Ox3pEEVw) — client paused + deactivated + subscription canceled (stacked bar)

**To complete the setup**, run from the repo root:

```bash
pnpm install
```

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-javascript_node/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
