# @fitflow/shared

Shared TypeScript types, interfaces, and constants consumed by both `@fitflow/api` and `@fitflow/web`.

---

## What's Exported

### Channel Abstraction (`src/channels/`)

The core messaging interface that makes business logic channel-agnostic:

```typescript
// Channel enum
enum Channel {
    WHATSAPP = "WHATSAPP",
    TELEGRAM = "TELEGRAM",
}

// Core interface — all messaging flows use this
interface DeliveryChannel {
    sendMessage(recipientId: string, content: string, clientId?: string): Promise<SendResult>
    sendStructuredCheckIn(recipientId: string, data: CheckInPrompt): Promise<SendResult>
    sendWorkout(recipientId: string, data: WorkoutPayload): Promise<SendResult>
    sendOnboarding(recipientId: string, data: OnboardingPayload): Promise<SendResult>
    sendTemplate(recipientId: string, templateId: TemplateId, context: Record<string, any>, clientId?: string): Promise<SendResult>
    sendVideo?(recipientId: string, data: VideoPayload): Promise<SendResult>
}

// Result type
interface SendResult {
    success: boolean
    messageId?: string
    error?: string
}
```

Adding a new channel (e.g., SMS) requires only implementing this interface — zero changes to schedulers, workers, or business logic.

### Template System (`src/templates/`)

Type-safe message template definitions with per-channel renderers:

```typescript
// 40+ template IDs covering the full lifecycle
enum TemplateId {
    // Lead/intake
    LEAD_ENQUIRY_RESPONSE, LEAD_PAYMENT_REQUEST, LEAD_PAYMENT_CONFIRMED,
    // Onboarding
    ONBOARDING_WELCOME, ONBOARDING_COMPLETE,
    // Workouts
    WORKOUT_DAILY, WORKOUT_REST_DAY, WORKOUT_WEEK_SUMMARY, WORKOUT_LOGGED_CONFIRMATION,
    // Check-ins
    CHECKIN_WEEKLY_PROMPT, CHECKIN_COACH_ACK, CHECKIN_MISSED_NUDGE,
    // At-risk/engagement
    ATRISK_MISSED_WORKOUT, ATRISK_THREE_PLUS, ATRISK_LAPSED,
    // Milestones
    MILESTONE_HALFWAY, MILESTONE_COMPLETION,
    // Meals
    MEAL_DAILY, MEAL_REST_DAY, MEAL_LOGGED_CONFIRMATION, MEAL_MISSED_NUDGE,
    // Payments
    PAYMENT_REMINDER, SYSTEM_BANK_DETAILS, SYSTEM_BANK_CONFIRMED,
    // Renewals
    RENEWAL_7DAY, RENEWAL_2DAY, RENEWAL_POST_EXPIRY,
    // Other
    EXERCISE_VIDEO, SYSTEM_BROADCAST,
    // ... and more
}

// Template definition with typed context
interface TemplateDefinition<TContext> {
    id: TemplateId
    description: string
    channels: {
        telegram: ChannelTemplate<TContext>
        whatsapp: ChannelTemplate<TContext>
    }
}
```

Each template has a typed context interface (e.g., `WorkoutDailyContext`, `CheckInPromptContext`) preventing runtime render failures.

### Subscription Types (`src/subscription.ts`)

Tier definitions, limits, and pricing used by both frontend (pricing display) and backend (enforcement):

```typescript
type SubscriptionTier = "STARTER" | "PRO" | "STUDIO"
type SubscriptionStatus = "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "UNPAID" | "INCOMPLETE"
type BillingInterval = "MONTHLY" | "ANNUAL"
type BillingCurrency = "usd" | "gbp"

// Tier limits (enforced server-side via middleware)
const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
    STARTER: { maxClients: 10, maxChannels: 1, analytics: false, ... },
    PRO:     { maxClients: 30, maxChannels: 2, analytics: true, ... },
    STUDIO:  { maxClients: 75, maxChannels: 2, analytics: true, whiteLabel: true, ... },
}

// Pricing in cents
const TIER_PRICING: Record<BillingCurrency, Record<SubscriptionTier, TierPricing>> = { ... }

const TRIAL_DAYS = 7
```

## Building

```bash
pnpm --filter @fitflow/shared build    # Compiles to dist/ via tsc
pnpm --filter @fitflow/shared type-check
pnpm --filter @fitflow/shared test
```

Output: `dist/` (CommonJS, with declaration maps).

Turborepo handles the build dependency — `@fitflow/api` and `@fitflow/web` depend on `@fitflow/shared`, so `turbo build` compiles this package first.

## Adding New Shared Code

**Put it here if**: Both `apps/api` and `apps/web` need the type, constant, or interface. Examples: enum values displayed in UI and validated on API, pricing constants, channel types.

**Don't put it here if**: Only one app uses it. Keep API-only types in `apps/api/src/lib/types.ts` and frontend-only types locally.

### Convention

1. Add your types/constants in `src/`
2. Re-export from `src/index.ts`
3. Run `pnpm --filter @fitflow/shared build` (or let Turborepo handle it)
4. Import in consuming app: `import { MyType } from "@fitflow/shared"`
