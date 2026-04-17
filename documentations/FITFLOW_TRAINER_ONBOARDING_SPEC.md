# FitFlow — Trainer Onboarding Spec
**Version:** 1.0  
**Author:** Ovalay Studios  
**Status:** Draft

---

## Overview

This document specifies the post-signup onboarding flow for new trainers on FitFlow. The register screen (name, email, password) is out of scope — this covers everything that happens after account creation.

The flow consists of three steps followed by a success state. It is a one-time wizard that appears immediately after a trainer creates their account.

### Flow summary

```
Register → Step 1: Profile → Step 2: Payments → Step 3: First client → Step 4: Messaging* → Dashboard

* Shown on messaging-enabled tiers only
```

| Step | Est. time | Skippable | Gated |
|------|-----------|-----------|-------|
| 1 — Profile setup | ~60s | Yes | No |
| 2 — Payment preference | ~30s | Yes | No |
| 3 — Add first client | ~90s | Yes | No |
| 4 — Connect messaging | ~60s | Yes | Tier |

Total time to activation: under 3 minutes (4 minutes on messaging-enabled tiers).

---

## Design Principles

- Each step has one job. No step asks more than 3 questions.
- Every step has a skip option — onboarding never blocks.
- Progress bar is always visible. Trainer always knows where they are.
- Step 3 (first client) is the activation moment — completing it is the north star metric.
- Data collected here pre-fills defaults across the app: payment model, plan templates, check-in cadence.

---

## Activation Metric

**Activated** = trainer completes Step 3 and lands on the dashboard with ≥1 client.

Target: 60%+ of signups reach activation within their first session.

Trainers who skip Step 3 must be re-prompted on first dashboard visit via an **inline empty-state CTA**, not a modal or toast.

---

## Data Collected & How It's Used

| Field | Collected in | Used for |
|-------|-------------|----------|
| Coaching name | Step 1 | Client-facing messages; dashboard display name |
| Speciality | Step 1 | Filters default plan templates shown to trainer |
| Client count | Step 1 | Sets dashboard view density; analytics cohort |
| Payment model | Step 2 | Sets `trainer.defaultPaymentModel` for all new clients |
| First client name | Step 3 | Creates first client record |
| First client goal | Step 3 | Populates client profile; filters plan suggestions |
| Payment structure | Step 3 | Creates first session block or payment record |

---

## Step 1 — Profile Setup

### Purpose
Personalise the app from day one. Template library, empty states, and default settings all change based on speciality.

### Fields

**Coaching name**
- Pre-filled from full name entered at register
- Editable
- Used in client-facing WhatsApp/Telegram messages
- Required. Max 40 characters.

**Speciality** *(multi-select chips)*
- Weight loss
- Strength
- Sports performance
- Rehab
- General fitness
- Nutrition

No hard requirement — if none selected, show soft nudge: *"Pick at least one so we can suggest the right templates."* Do not block progression.

**Active clients right now** *(3-option selector)*
- 0–5 (just starting)
- 6–15 (growing)
- 16+ (established)

Not surfaced to clients. Used for dashboard layout and internal analytics cohort segmentation.

### Behaviour
- Coaching name auto-populates from register — trainer confirms or edits
- Speciality selection immediately filters which template packs are shown in Step 3
- Skip saves nothing and passes through with system defaults

---

## Step 2 — Payment Preference

### Purpose
Set the default payment model applied to all new clients. Removes per-client configuration overhead for the most common case.

### Options *(single select)*

**Session blocks**
Clients buy a pack of sessions upfront. FitFlow tracks remaining sessions and alerts trainer when a client's balance is low.

**Per session**
Each session is logged as a payable event. Trainer manually marks sessions as paid or unpaid.

**Monthly retainer**
Fixed monthly amount regardless of session count. FitFlow surfaces overdue retainers.

**Set up later**
Defers to per-client configuration. No default is set. Trainer configures payment model each time they add a client.

### Behaviour
- Selection sets `trainer.defaultPaymentModel`
- If "Session blocks" selected → Step 3 shows block size and price-per-session fields
- If "Monthly retainer" selected → Step 3 shows monthly amount field
- If "Per session" selected → Step 3 shows price-per-session field only
- No Stripe connection at this step — payment method (Stripe vs manual) is a separate flow in Settings
- Skip defaults to "Set up later"

### Key Decision
FitFlow is not processing payments during onboarding. This step is about **tracking structure**, not payment capture. Stripe Connect lives in Settings.

---

## Step 3 — Add First Client

### Purpose
This is the activation moment. A trainer who adds one real client has invested in the product. This is the single most important step in the entire onboarding flow.

### Fields

**Name** *(required)*
First and last name in a single field.

**Email** *(optional)*
Used for future client-facing messaging. Not required to proceed.

**Primary goal** *(single select chips)*
Chips are filtered by the trainer's speciality selected in Step 1.

- Weight loss
- Build muscle
- General fitness
- Sports performance
- Rehab
- Improve nutrition

**Payment fields** *(conditional on Step 2 selection)*

| Step 2 selection | Fields shown in Step 3 |
|-----------------|------------------------|
| Session blocks | Sessions per block, price per session |
| Per session | Price per session |
| Monthly retainer | Monthly amount |
| Set up later | No payment fields shown |

### Behaviour
- Goal chips are pre-filtered by trainer's speciality — irrelevant goals are hidden, not greyed out
- Payment fields adapt to Step 2 selection (see table above)
- On submit: creates client record, creates first session block (if applicable), fires `trainer.activated` analytics event
- "Skip — go to dashboard" lands trainer on dashboard with empty state + persistent inline nudge to add first client (not re-shown as a modal)

### CTA Copy
Primary action: **"Add client & finish"** — not "Complete" or "Done". Concrete language that confirms what the action does.

---

## Success State

### Purpose
Celebrate the moment. Confirm what was created. Set up the next actions without overwhelming.

Shown only if trainer completed Step 3. If Step 3 was skipped, trainer lands directly on the dashboard empty state.

### Content

**Personalised heading**
Uses coaching name from Step 1.
> "You're all set, Coach [Name]"

Not generic. If coaching name was skipped, fall back to first name from register.

**Client summary card**
Displays the client just added: name, primary goal, sessions remaining (if block), block value. Confirms the data was saved correctly.

**What's ready checklist**
2–3 ticked items (completed) + 2 suggested next actions (open circles).

Ticked items (always shown):
- Client profile created
- Session block tracked (X sessions) — only if session block was set up
- [Speciality] templates available

Open circle items (contextual — shown based on what's still incomplete):
- Assign first training plan — if no plan assigned
- Set up check-in schedule — if no check-in cadence set
- Connect WhatsApp — if messaging not yet configured

Clicking an open circle takes trainer directly to that section of the client profile, not the generic dashboard.

**CTA**
"Go to dashboard →"

---

## Edge Cases

### Trainer skips all three steps
Lands on dashboard with an empty state card:
> "Add your first client to get started"
Inline CTA. No modal. No toast. Persists until first client is added.

### Trainer skips Step 1 but completes Step 3
Goal chips in Step 3 show all options (no filtering). Templates shown are the full library.

### Trainer skips Step 2 but completes Step 3
No payment fields shown in Step 3. Client is created with no payment model. Trainer is shown a prompt on the client's profile to set up payment tracking.

### Trainer returns mid-flow (closes browser, comes back)
Onboarding state is persisted. Trainer resumes from the step they left. Progress bar reflects correct position.

---

## Analytics Events

| Event | Fired when |
|-------|-----------|
| `onboarding.started` | Trainer lands on Step 1 after register |
| `onboarding.step1.completed` | Step 1 submitted (not skipped) |
| `onboarding.step1.skipped` | Skip tapped on Step 1 |
| `onboarding.step2.completed` | Step 2 submitted (not skipped) |
| `onboarding.step2.skipped` | Skip tapped on Step 2 |
| `onboarding.step3.completed` | Step 3 submitted (not skipped) |
| `onboarding.step3.skipped` | Skip tapped on Step 3 |
| `trainer.activated` | Step 3 completed — first client created |
| `onboarding.completed` | Success state reached |

---

## Decisions Log

| # | Question | Decision |
|---|----------|----------|
| 1 | Should coaching name default to full name or "Coach [First]"? | Either format is acceptable — trainer can edit freely. Placeholder should suggest "Coach [First]" per existing register screen convention. |
| 2 | Does skipping Steps 1–2 affect template matching? | Yes. Skipping Step 1 (speciality) shows the full template library with no filtering. This is the degraded experience — the prompt to select a speciality should make the benefit clear: *"Pick a speciality to see relevant templates."* |
| 3 | Re-engagement strategy for trainers who signed up but never activated? | Email sequence. Trigger on `onboarding.started` without subsequent `trainer.activated` within 24 hours. See email sequence spec below. |
| 4 | Should there be a WhatsApp/Telegram connection step in onboarding? | Yes — gated by tier. Skippable. Added as Step 4 for eligible tiers. See Step 4 spec below. |

---

## Step 4 — Connect Messaging (Tier-gated)

### Purpose
WhatsApp and Telegram are core FitFlow delivery channels. Connecting at onboarding means the trainer's first client interaction can happen inside FitFlow from day one, rather than requiring a separate setup visit later.

### Visibility
Shown only to trainers on tiers that include messaging. Not shown to free/entry-tier trainers. If a trainer later upgrades to a messaging-enabled tier, they are prompted to connect on first visit to the Messages section.

### Options *(single select)*

**WhatsApp**
Connect via WhatsApp Business API. Trainer's messages send from a FitFlow-managed number or their own verified number (depending on tier).

**Telegram**
Connect via Telegram Bot API. Per-coach bot auto-provisioned on connection.

**Both**
Available on higher tiers. Clients can be assigned a preferred channel per client.

**Connect later**
Skips this step. Trainer is shown a persistent nudge in the sidebar until connected.

### Behaviour
- OAuth / API key connection flow opens in a sheet or new tab — does not navigate away from onboarding
- On successful connection, step auto-advances to success state
- If connection fails, show inline error with retry option — do not block progression
- Skipping adds a `messaging.not_connected` flag to the trainer record, used to trigger the sidebar nudge

### CTA Copy
Primary action: **"Connect & finish"**
Skip: **"I'll do this later"**

---

## Re-engagement Email Sequence

Triggered when `onboarding.started` fires but `trainer.activated` does not fire within 24 hours.

| Email | Trigger | Subject | Core message |
|-------|---------|---------|--------------|
| 1 | 24h after signup, no activation | "You're one step away" | Remind trainer they haven't added a client yet. Single CTA back to Step 3. |
| 2 | 72h after signup, no activation | "Here's what FitFlow does for coaches like you" | Social proof — one concrete example of time saved on admin. CTA to dashboard. |
| 3 | 7 days after signup, no activation | "Still figuring things out?" | Soft check-in. Offer a short onboarding call or link to help docs. No hard sell. |

Sequence stops as soon as `trainer.activated` fires. No email is sent after activation.

---

*FitFlow · Ovalay Studios · v1.0*
