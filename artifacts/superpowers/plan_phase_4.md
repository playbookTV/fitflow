# Superpowers Write Plan — Phase 4: Scheduling & Automation

## Goal
Implement the core automation logic for FitFlow: Timezone-aware workout delivery, weekly check-in reminders, and the onboarding state machine.

## Assumptions
- `redis` is running and accessible via `REDIS_URL`.
- Twilio WhatsApp templates are (or will be) approved for "Workout Ready" and "Check-in Reminder".
- The trainer dashboard relies on the API to trigger these processes.

## Plan

### Step 1: Timezone Utility & Job Types
- **Files**: `apps/api/src/lib/types.ts`, `apps/api/src/lib/time.ts`
- **Change**: Define job names for BullMQ. Implement a helper to calculate "ms until next 7 AM in timezone X".
- **Verify**: Run a small test script to verify that `getTimeUntil7AM('America/New_York')` returns the correct milliseconds.

### Step 2: Daily Workflow Scheduler
- **Files**: `apps/api/src/jobs/daily-scheduler.ts`
- **Change**: Implement the cron function that queries `PlanAssignment`, calculates delays, and adds jobs to `workout-delivery` queue.
- **Verify**: `node src/jobs/daily-scheduler.ts` should show enqueued jobs in BullBoard.

### Step 3: Weekly Check-in Scheduler
- **Files**: `apps/api/src/jobs/weekly-checkin.ts`
- **Change**: Implement Sunday 8 PM reminder logic. Add check to skip if `CheckIn` exists for the current ISO week.
- **Verify**: Run manually for a client with/without a recent check-in; verify only one enqueues.

### Step 4: Worker Logic Implementation
- **Files**: `apps/api/src/workers/workoutProcessor.ts`
- **Change**: Update the worker to fetch the correct day's workout, format the WhatsApp message (Exercises, Sets/Reps), and call Twilio.
- **Verify**: Manually move a job from "delayed" to "active" in BullBoard and check logs for successful Twilio API call.

### Step 5: Onboarding Automation
- **Files**: `apps/api/src/routes/payment-webhook.ts`
- **Change**: Connect the successfully verified Stripe payment to a `startOnboarding` service that enqueues the first intake Flow.
- **Verify**: Mock a Stripe success webhook and verify the intake Flow is enqueued for the client.

## Risks & mitigations
- **Risk**: Redis memory exhaustion from too many delayed jobs. 
- **Mitigation**: Set `removeOnComplete: true` and `maxLen: 1000` for job history.
- **Risk**: Twilio sandbox limitations.
- **Mitigation**: Use a dedicated "test" flag to log messages instead of sending during high-volume dev runs.

## Rollback plan
- Delete the cron jobs and clear the BullMQ queues via BullBoard. Standard Prisma rolling back if schema changes were needed (none expected).

**Approve this plan? Reply APPROVED if it looks good.**
