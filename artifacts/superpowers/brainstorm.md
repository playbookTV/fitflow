# Brainstorm: Pivot from Twilio to Meta Cloud API Direct

## Goal
The goal is to migrate our WhatsApp messaging system from Twilio's WhatsApp API to Meta's WhatsApp Cloud API Direct. This pivot aims to reduce operational costs and gain more direct control over the messaging infrastructure.

## Constraints
- **Functionality Parity**: Must support all current use cases: manual coaching messages, automated workout deliveries, check-in reminders, and onboarding intake.
- **Template Compliance**: Meta requires pre-approved templates for business-initiated messages.
- **Infrastructure**: Must integrate seamlessly with the existing Express/Node.js API and Prisma database.
- **Ease of Maintenance**: The new solution should be as easy to maintain as the current Twilio implementation.

## Known context
- **Current Stack**: Twilio Node SDK, Express, BullMQ (for background jobs), Prisma.
- **Current Logic**: A single wrapper function `sendWhatsAppMessage` in `apps/api/src/lib/twilio.ts` handles all outgoing messages.
- **Addressing**: Twilio uses the `whatsapp:+1234567890` format for phone numbers.

## Risks
- **Template Lockdown**: Business-initiated messages will fail if templates aren't approved by Meta, potentially breaking automated workflows.
- **Webhook Migration**: Incoming messages (replies like "DONE") will require a new webhook endpoint and validation logic (Meta uses a different verification challenge).
- **PhoneNumber Format**: Need to ensure the database phone numbers are compatible with Meta's numeric-only format (no `whatsapp:` prefix).

## Options (2–4)
1. **Option 1: Direct Graph API Integration (Native)**
   - Use `fetch` or `axios` to send POST requests to Meta's Graph API.
   - **Pros**: Zero additional dependencies, full control, lowest cost.
   - **Cons**: Requires manual implementation of retry logic and error handling.

2. **Option 2: Community SDK (e.g., `whatsapp-cloud-api`)**
   - Use a third-party library to wrap the Meta Cloud API.
   - **Pros**: Simplified API, handles some boilerplate.
   - **Cons**: Adds a dependency, potential for the library to fall out of date with Meta's frequent API changes.

3. **Option 3: Abstracted Messenger Service**
   - Create a generic `MessagingProvider` interface and implement a `MetaCloudProvider`.
   - **Pros**: Makes future pivots easier.
   - **Cons**: Over-engineering for the current phase.

## Recommendation
**Option 1: Direct Graph API Integration (Native)**.
The current messaging requirements are simple enough that a custom wrapper around Meta's Graph API is the most efficient and cost-effective approach. It avoids vendor lock-in with a third-party SDK and keeps the codebase clean. We can implement a robust `MetaService` that handles template selection and message sending.

## Acceptance criteria
- [ ] `META_WHATSAPP_ACCESS_TOKEN`, `META_WHATSAPP_PHONE_NUMBER_ID`, and `META_WHATSAPP_BUSINESS_ACCOUNT_ID` added to `.env`.
- [ ] New `apps/api/src/lib/meta.ts` created to replace `twilio.ts`.
- [ ] `sendWhatsAppMessage` updated to use Meta's API.
- [ ] Automated messages (Workout/Check-in/Onboarding) successfully formatted to use Meta Templates if necessary.
- [ ] Webhook endpoint updated to handle Meta's verification challenge and incoming message format.
