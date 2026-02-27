# Superpowers Brainstorm — Phase 4: Scheduling & Automation

## Goal
Implement a robust, timezone-aware scheduling system for workout delivery and automated check-in reminders using BullMQ and Redis. This "brain" of FitFlow will ensure clients receive their plans at 7 AM local time and move through the onboarding funnel without trainer intervention.

## Constraints
- **Queueing**: Must use BullMQ/Redis (already scaffolded in `apps/api`).
- **Timezones**: Must handle client-specific timezones reliably (Europe/London vs. US/Eastern).
- **Deliverability**: WhatsApp messages must be triggered via the existing Twilio utility.
- **Idempotency**: Ensure we don't accidentally spam clients with multiple check-in prompts in the same week.

## Known context
- `apps/api/src/workers/workoutProcessor.ts` already exists and is mounted in `index.ts`.
- `Prisma` schema has `PlanAssignment`, `CheckIn`, and `Trainer` models.
- `Client` model includes a `timezone` field.
- `apps/api/.env` already contains `REDIS_URL`.

## Risks
- **Timezone Math**: 7 AM local time might be in the past or far future relative to the 00:01 UTC cron.
- **Redis Stability**: If Redis goes down, enqueued jobs must persist ( mitigated by Railway's persistent Redis).
- **Rate Limiting**: Sending hundreds of WhatsApp messages simultaneously might hit Twilio/Meta limits.

## Options (2–4)
1. **Option A: Pure UTC Cron**: Run a cron every hour and filter for clients whose local time is currently 7 AM. *Simple but less precise for non-hourly offsets.*
2. **Option B: Daily Enqueue with Delay (Recommended)**: Run a single daily cron at 00:01 UTC, calculate the millisecond delay until 7 AM for every active assignment, and enqueue them with `delay`. *Most precise and utilizes BullMQ's native features.*
3. **Option C: Real-time Triggering**: Use a long-running polling service. *Resource intensive.*

## Recommendation
**Option B** is the standard for high-scale notification systems. It decouples the "finding who to message" (Cron) from the "actually messaging" (Worker) and handles delays beautifully.

## Acceptance criteria
- [ ] Daily workout jobs are enqueued with correct millisecond delays for London and NY timezones.
- [ ] BullBoard shows jobs in "delayed" state correctly.
- [ ] Check-in reminders are skipped if a check-in already exists for the current week.
- [ ] Client status automatically moves to `ACTIVE` upon payment success (Onboarding pipeline).
