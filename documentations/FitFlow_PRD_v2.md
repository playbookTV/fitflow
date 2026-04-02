# FITFLOW
## Product Requirements Document

| Field | Detail |
|---|---|
| **Status** | Ready for concept validation and MVP scoping |
| **Version** | 2.0 — Updated PRD |
| **Core thesis** | Coaches keep using WhatsApp or Telegram. FitFlow adds structure, onboarding, delivery, and retention behind the scenes — on both channels — without forcing clients to download a new app. |
| **Key changes from v1** | Instagram automation removed permanently. Telegram added as co-equal delivery channel alongside WhatsApp. Per-coach Telegram bot provisioning. Channel-parametered offer links. Telegram used as Phase 0 beta rail. |

---

## 1. Product Overview

**Product:** FitFlow

**Category:** Coaching operations software for online personal trainers

**Primary delivery channels:** WhatsApp and Telegram

**Primary buyer:** Independent online coach managing approximately 20 to 80 active clients

**Core promise:** Run client onboarding, workout delivery, check-ins, and retention from one structured system — delivered through WhatsApp or Telegram, without asking clients to download another app.

---

## 2. Problem Statement

Online coaches are running real businesses on consumer tools. Client conversations live in WhatsApp threads, workouts sit in PDFs or shared folders, progress tracking happens in spreadsheets, and payments are handled separately through Stripe links or bank transfers. As coaches grow, the operating model becomes fragile.

- The current stack is fragmented: WhatsApp, Telegram, spreadsheets, notes, payment links, and file storage do not talk to each other.
- The business breaks at scale: once coaches move beyond a small client book, they struggle to maintain consistency without hiring admin help.
- Most existing coaching platforms try to replace WhatsApp with a dedicated client app; this creates behavioural friction for both coach and client.
- Automation cannot come at the cost of intimacy; coaches want structure behind the scenes without making their service feel robotic.

---

## 3. Product Vision and Principles

**Keep the client where they already are.**
FitFlow supports WhatsApp-native and Telegram-native delivery rather than retraining clients into a new coaching app.

**Support both major messaging channels.**
WhatsApp and Telegram are co-equal delivery channels. Coaches connect one or both during onboarding and set a default. Clients are routed to the correct channel automatically via offer links.

**Structure the coach, not the conversation.**
The system should make the business more organised while preserving the personal feel of coach-client communication.

**Own the operations spine.**
FitFlow should become the source of truth for client status, onboarding, workouts, check-ins, renewals, and at-risk flags — regardless of which channel the client is on.

**Avoid unnecessary regulated surface area.**
FitFlow should not hold money or sit in the middle of payment processing. It connects to coach-owned payment methods and automates after payment events.

**Start with one clean wedge.**
The MVP focuses on coaches who already sell online coaching and already use WhatsApp or Telegram — not broader fitness or service-provider workflows.

---

## 4. Target User and Segments

### Primary Persona: Online Coach (Core)

**Profile:** Independent online personal trainer or fitness coach managing roughly 20–80 active clients. They acquire leads through Instagram, WhatsApp, word-of-mouth, or link-in-bio traffic and already sell structured coaching packages.

**Buying trigger:** They feel the pain of fragmented operations — manual onboarding, payment chasing, inconsistent check-ins, poor visibility into who is slipping, and too much time spent managing logistics instead of coaching.

**Willingness to pay:** Moderate to strong, if FitFlow saves time, supports more clients, and makes the service feel more professional without forcing app adoption on clients.

### Secondary Segments (Later)

- High-ticket online coaches who value a premium, branded client experience and may pay for onboarding or white-glove setup.
- Small coaching teams or agencies that need multiple coach seats and shared operational visibility.
- Hybrid gym-based PTs are adjacent but should not shape the MVP.

---

## 5. Jobs to Be Done

- When a prospect is ready to start, I want to send them one clear link so they can complete intake, pay me, and enter my coaching workflow — on the messaging channel they already use.
- When a client becomes active, I want onboarding and the first workout to happen quickly and consistently so I do not waste time repeating setup steps.
- When I am managing dozens of clients across WhatsApp and Telegram, I want one dashboard that shows who is active, who has checked in, who has missed steps, and who needs attention.
- When I use WhatsApp or Telegram to coach, I want structure behind my delivery without losing the personal feel that helps clients stay engaged.
- When payments, renewals, or check-ins happen, I want FitFlow to trigger the right next action automatically instead of relying on my memory.

---

## 6. Product Scope

### In Scope for MVP

- Coach dashboard with client list, statuses, channel indicators, latest activity, and manual action controls.
- Unique coach links and offer-specific links with channel parameters (WhatsApp or Telegram) and source attribution tags.
- Lead / intake page that captures prospect details and routes them into the correct channel onboarding path.
- Channel abstraction layer: a DeliveryChannel interface with WhatsApp and Telegram as adapters. Core scheduling, client state machine, and check-in logic are channel-agnostic.
- Coach channel onboarding: connect WhatsApp Business number and/or Telegram bot during setup. Automatic per-coach Telegram bot provisioning (no BotFather interaction required from the coach).
- Coach-owned payment connection: Stripe payment links as the preferred automated route, with manual bank-transfer confirmation as a supported fallback.
- Payment-status-triggered activation logic.
- WhatsApp onboarding flow using WhatsApp Flows for structured intake.
- Telegram onboarding flow using inline keyboards and conversation prompts.
- Workout assignment and scheduled delivery via WhatsApp messages or Telegram bot messages.
- Weekly check-in flow — WhatsApp Flows or Telegram inline keyboard depending on client channel.
- At-risk logic that flags inactive or unresponsive clients for coach follow-up.
- Basic renewal reminders and re-engagement prompts.

### Explicitly Out of Scope for MVP

- Instagram automation of any kind — comment-to-DM, Instagram Messaging API, DM sequences. **This is a permanent decision, not a deferral.**
- Client mobile app or coach mobile app.
- FitFlow-held payments, wallet logic, payout logic, or merchant-of-record responsibilities.
- Marketplace features, programme marketplace, or lead marketplace.
- Deep analytics, forecasting, or advanced performance reporting beyond essential operational visibility.
- Multi-coach team management beyond a light placeholder in the data model.
- White-label domains and heavy branding customisation.

---

## 7. Solution Overview

FitFlow is the operational layer behind WhatsApp and Telegram coaching. Each coach gets a unique public link that can be shared anywhere — Instagram bio, TikTok, WhatsApp broadcast, Telegram channel. Offer-specific link variants carry a channel parameter so the prospect is routed to the correct messaging experience automatically.

A prospect lands on the coach's FitFlow page, completes intake, and is directed to the coach's payment method. Once payment is confirmed, FitFlow activates the client, launches onboarding on the correct channel, schedules delivery, and starts the weekly check-in loop.

### Channel Architecture

- **WhatsApp adapter:** WhatsApp Cloud API, WhatsApp Flows for structured check-ins and intake, template messages for scheduled delivery.
- **Telegram adapter:** Per-coach Telegram bot (auto-provisioned), inline keyboards for structured responses, rich message formatting for workout delivery.
- **Channel router:** Single interface, two adapters. Core business logic — scheduling, state machine, check-in scoring — never knows which channel it is talking to.
- **Per-coach Telegram bots:** Each coach gets their own bot (e.g. @CoachSarahFitBot), provisioned automatically during onboarding. Clients interact with their coach's bot, not a generic FitFlow bot.

### Offer Link Architecture

Each link carries four parameters: coach identifier, offer context, channel (WhatsApp or Telegram), and source tag for attribution. A coach targeting a WhatsApp audience shares a WhatsApp-parametered link. The same coach sharing in a Telegram community shares a Telegram-parametered link. FitFlow handles routing — no friction for the prospect.

**Example structure:** `fitflow.co/coach-slug/offer-slug?ch=wa&src=igbio`

### Core MVP Flow

| Step | User touchpoint | System action | Output |
|---|---|---|---|
| 1 | Coach shares channel-parametered FitFlow link (WhatsApp or Telegram variant) | FitFlow logs source, channel, and offer context | Lead enters structured intake path on correct channel |
| 2 | Prospect completes intake / application on the web page | Lead record created with channel tag and offer context | Coach can review or auto-progress the lead |
| 3 | Prospect pays via coach-owned Stripe link or bank transfer | Payment event or coach confirmation received | Client status changes to active; channel confirmed |
| 4 | Client receives onboarding via WhatsApp or Telegram bot | Welcome, intake follow-up, and first assignment triggered on correct channel | Client enters delivery loop |
| 5 | Coach assigns workout plan in dashboard | Scheduler queues workout messages per channel adapter | Client receives workouts in WhatsApp or Telegram |
| 6 | Weekly check-in arrives via WhatsApp Flow or Telegram inline keyboard | Structured responses stored and scored | Coach sees progress and at-risk signals in dashboard |

---

## 8. Functional Requirements

**FR-1 — Coach accounts and workspace**
The product must allow coaches to create an account, configure profile basics, and manage their own client workspace.

**FR-2 — Channel connection and bot provisioning**
During onboarding, coaches must be able to connect WhatsApp Business (via Cloud API), Telegram (via automatic per-coach bot provisioning), or both. Coaches set a default channel if both are connected.

**FR-3 — Offer links with channel parameters**
The product must generate unique shareable URLs per coach and support offer-specific variants carrying channel parameters (WhatsApp or Telegram) and source attribution tags.

**FR-4 — Lead capture**
The product must capture prospect details from public pages and create a lead record with source attribution, offer context, channel tag, and status.

**FR-5 — Payment routing**
The product must support coach-owned Stripe payment links and manual bank-transfer workflows without FitFlow holding customer funds.

**FR-6 — Activation logic**
The product must activate a client only after a qualifying event — Stripe webhook confirmation or explicit coach confirmation — and record the confirmed delivery channel.

**FR-7 — Channel abstraction layer**
The system must implement a DeliveryChannel interface with WhatsApp and Telegram as interchangeable adapters. Business logic must be channel-agnostic.

**FR-8 — WhatsApp onboarding and delivery**
For WhatsApp clients: the product must send onboarding messages using WhatsApp Flows for structured intake, and deliver workouts via scheduled template messages.

**FR-9 — Telegram onboarding and delivery**
For Telegram clients: the product must send onboarding messages and collect structured intake data using per-coach Telegram bots with inline keyboards. Workouts must be delivered via scheduled bot messages.

**FR-10 — Workout management**
The product must allow a coach to create or assign workout plans and schedule workout delivery by day or programme cadence, delivered on the client's channel.

**FR-11 — Check-ins**
The product must run recurring structured check-ins via the client's channel and store key response data for coach review.

**FR-12 — Operational dashboard**
The dashboard must show active clients, leads, channel per client, payment state, last interaction, due check-ins, and at-risk indicators. Mixed-channel cohorts must be handled gracefully.

**FR-13 — Coach intervention**
The coach must be able to manually trigger messages, override automation, and update client statuses when needed — regardless of channel.

**FR-14 — Renewal support**
The product must support reminder prompts for renewals or expiring coaching periods, delivered on the client's channel.

**FR-15 — Auditability**
The system must keep an event history sufficient to understand key transitions: lead creation, payment confirmation, activation, check-in completion, plan assignment, and channel assignment.

---

## 9. Non-Functional Requirements

- **Reliability:** Scheduled workout delivery and check-ins must be dependable across both channels, with retry logic and clear failure handling for queued messages.
- **Security:** Authentication, encrypted transport, and secure credential handling are required. Bot tokens must be stored securely and isolated per coach.
- **Privacy:** Only necessary client data should be stored, with explicit attention to coach workspace isolation and least-privilege access.
- **Performance:** Coach dashboard interactions should feel fast on mobile and desktop; public intake pages should load quickly from share links.
- **Extensibility:** The channel abstraction must allow future delivery adapters to be added without rewriting core business logic.
- **Observability:** Webhook failures, queue failures, bot delivery errors, and WhatsApp template rejections must be visible in logs or monitoring.

---

## 10. User Experience Requirements

- The client-facing experience must feel simple, direct, and personal — not corporate or over-automated — regardless of whether they are on WhatsApp or Telegram.
- Coach workflows should favour clarity over dashboard bloat. The product should feel like an organised notebook with automation, not enterprise CRM theatre.
- Public intake pages should be optimised for mobile-first use because most prospects will arrive from social platforms on a phone.
- The system should preserve room for personal coach touchpoints — voice notes, manual follow-up — rather than replacing them.
- During coach onboarding, channel connection must be simple and frictionless. Telegram bot provisioning must happen automatically — coaches should never need to interact with BotFather.

---

## 11. Monetisation Model

FitFlow charges coaches a subscription fee for software access. The product does not monetise by holding customer funds or taking a percentage of coaching revenue.

> **Note on unit economics:** Telegram has zero per-message cost. WhatsApp Cloud API has per-conversation fees beyond the free tier. This does not affect pricing tiers at MVP scale but should be factored into longer-term unit economics.

| Plan | Indicative price | Intended user | Included scope |
|---|---|---|---|
| Starter | £19–29/mo | Coach with lighter active volume | Core CRM, links, onboarding, delivery, check-ins — WhatsApp or Telegram |
| Pro | £39–59/mo | Core persona: 20–80 active clients | Everything in Starter plus stronger automation and operational visibility |
| Team | £89–129/mo | Coaching teams / agencies | Multiple coach seats, broader workspace controls (later phase) |

**Optional secondary revenue:** One-time setup, migration from spreadsheets or existing coaching stacks, and premium onboarding support for high-ticket coaches.

**Intentionally avoided:** No transaction take-rate in the MVP, no platform-owned wallet, and no payment-processing positioning that would blur the product into fintech.

---

## 12. Integrations and Architecture Assumptions

- **WhatsApp Business / Cloud API:** Onboarding flows, workout delivery, and check-ins for WhatsApp clients. Template approval required for all outbound message types.
- **Telegram Bot API:** Per-coach bot provisioning, onboarding, workout delivery, and inline keyboard check-ins for Telegram clients. No template approval required. Zero per-message cost.
- **Stripe:** Preferred payment-confirmation route via payment links and webhooks for client activation automation.
- **Bank transfer:** Supported as a manual or semi-manual fallback path, with coaches confirming receipt inside FitFlow.
- **Job queue (e.g. BullMQ):** Required for timezone-aware scheduled messages and weekly check-ins across both channels.
- **Bot registry:** Internal store of per-coach Telegram bot tokens and webhook endpoints. Must be designed for clean management at scale.
- **Channel abstraction layer:** DeliveryChannel interface with WhatsApp and Telegram adapters. Core scheduling and state machine are channel-agnostic.

---

## 13. Data Model (High Level)

**Coach:** Account, profile, subscription, link settings, payment settings, connected channels (WhatsApp number, Telegram bot token), default channel.

**Offer / Link:** Offer name, slug, channel parameter, source tags, CTA type, payment route, intake form mapping.

**Lead:** Prospect profile, source, channel tag, intake responses, status, assigned offer.

**Client:** Active profile, onboarding state, payment state, assigned plan, coach relationship, preferred channel, channel identifier (WhatsApp number or Telegram chat ID).

**Workout plan:** Template, schedule, exercises, assignment rules.

**Check-in:** Period, structured responses, timestamp, completion state, risk score, channel delivered on.

**Bot registry:** Coach ID, Telegram bot token, bot username, webhook URL, provisioned at timestamp.

**Event log:** Key state changes and automation history, including channel context.

---

## 14. Risks and Mitigations

| Risk | Why it matters | Mitigation |
|---|---|---|
| WhatsApp API approval delay | Cloud API requires Meta approval; templates need ongoing review. Delays could block onboarding and delivery. | Use Telegram as the Phase 0 beta rail. Prove the full workflow with real coaches on Telegram before WhatsApp approval lands. |
| WhatsApp message template friction | Every outbound message type needs a pre-approved template. Rejections slow iteration. | Build the delivery and check-in loop on Telegram first. Port templates to WhatsApp once the content is proven. |
| Over-automation risk | Coaches may feel the product makes their service feel robotic and impersonal. | Position FitFlow as operational support. Preserve manual intervention touchpoints and design client messages to feel human and lightweight. |
| Payment edge cases — bank transfer | Manual bank transfer flows are slow and rely on coach action to confirm receipt. | Treat Stripe as the preferred automated path. Bank transfer is a supported fallback with clear status controls and a coach approval step. |
| Scope creep | Temptation to re-add Instagram, build client apps, or add deep analytics too early. | Use MVP boundaries as a decision filter. Instagram is permanently deferred. Delay anything not required to prove the core workflow. |
| Low willingness to pay — early-stage coaches | Coaches below the 20-client threshold may not feel enough pain to justify a subscription. | Target coaches already at the 20–80 client pain threshold. Keep lighter tiers constrained rather than overly generous. |
| Telegram bot registry complexity | Managing N bot tokens and N webhooks at scale can become messy. | Design the bot registry cleanly from day one with a proper data model. One token and webhook per coach, managed automatically by FitFlow. |

---

## 15. Success Metrics for MVP

- At least 10 discovery interviews with coaches managing 20+ clients, confirming the problem and validating the dual-channel model.
- A functioning end-to-end test of the core workflow on Telegram: intake link → payment confirmation → activation → Telegram bot onboarding → scheduled workout delivery → weekly check-in.
- A functioning end-to-end test of the same workflow on WhatsApp once Cloud API access is approved.
- Evidence that coaches are willing to share a channel-parametered FitFlow link as part of their acquisition flow.
- Early willingness to pay signals — verbal commitments, waitlist opt-ins, or concierge pilots — around a monthly subscription model.

---

## 16. Phased Roadmap

### Phase 0: Feasibility and Telegram Beta

- Provision per-coach Telegram bots and prove the full delivery loop: onboarding, workout delivery, weekly check-in, at-risk flagging.
- Onboard 3–5 real coaches to a Telegram beta cohort. Run real clients through the full workflow.
- Apply for WhatsApp Cloud API access in parallel. Prove Stripe webhook to client-activation flow.
- Validate scheduler reliability for timed workout delivery and check-ins.
- Interview target coaches and pressure-test willingness to pay and workflow fit.
- Use Telegram beta findings to validate and refine before WhatsApp launch.

### Phase 1: Core MVP — WhatsApp + Telegram

- Coach accounts, dashboard, offer links with channel parameters, lead capture, payment routing, onboarding on both channels, workout delivery, check-ins, and at-risk flags.
- Channel abstraction layer fully implemented with WhatsApp and Telegram adapters.
- Per-coach Telegram bot auto-provisioning in coach onboarding.

### Phase 2: Commercial Strengthening

- Improved analytics, richer renewal flows, premium onboarding services, and possible migration tooling.
- Unit economics review — WhatsApp per-conversation cost vs. Telegram zero-cost — to inform pricing adjustments if needed.

### Phase 3: Optional Expansion

- Team workspaces and multi-coach operations.
- Higher-end branding and premium customer-experience layers for high-ticket coaches.
- Additional delivery adapters (e.g. SMS as a fallback) using the channel abstraction layer.

---

## 17. Open Questions

1. What is the minimum viable workout-plan builder required before coaches feel this is better than sending manual PDFs or notes?
2. How much structured data should FitFlow require during onboarding before the experience starts to feel heavy?
3. Should at-risk scoring remain simple and rules-based in the MVP, or should coaches be able to customise alert thresholds?
4. How much payment-state automation is achievable across Stripe and manual bank transfer without making the product operationally noisy?
5. What onboarding or migration service can be productised early as a revenue and activation lever?
6. When a coach has both WhatsApp and Telegram connected, can a client switch channels mid-engagement — and if so, what is the UX for that?
