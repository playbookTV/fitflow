# Meta Graph API Explorer — Testing Runbook

## Overview

Use the [Graph API Explorer](https://developers.facebook.com/tools/explorer/2736422046719331/) to manually test FitFlow's WhatsApp Cloud API integration and generate tokens for automated contract tests.

## Step 1: Generate Access Token

1. Navigate to: https://developers.facebook.com/tools/explorer/2736422046719331/
2. Select your Meta App (FitFlow)
3. Click "Generate Access Token"
4. Grant permissions:
   - `whatsapp_business_messaging` (send messages, manage flows)
   - `whatsapp_business_management` (manage templates, phone numbers)
5. Copy the generated User Token

> **Note:** User tokens from Graph Explorer expire in ~1 hour. For long-lived testing, generate a System User Token from Business Settings.

## Step 2: Run Automated Contract Tests

```bash
# Set environment variables
export META_TEST_ACCESS_TOKEN="<your-token>"
export META_WHATSAPP_PHONE_NUMBER_ID="<your-phone-id>"
export META_WHATSAPP_BUSINESS_ACCOUNT_ID="<your-waba-id>"
export META_TEST_PHONE_NUMBER="<test-recipient-phone>"  # Optional: for send tests

# Run contract tests
pnpm --filter @fitflow/api vitest run src/__tests__/meta-integration
```

## Step 3: Manual API Tests in Graph Explorer

### Verify Phone Number
```
GET /{PHONE_NUMBER_ID}
```
Expected: Returns phone number details including `verified_name`, `display_phone_number`.

### List Message Templates
```
GET /{BUSINESS_ACCOUNT_ID}/message_templates?limit=100
```
Expected: Returns all registered templates. Cross-reference with `META_TEMPLATES` in `src/lib/templates/meta-templates.ts`.

### Send Test Text Message
```
POST /{PHONE_NUMBER_ID}/messages

Body:
{
  "messaging_product": "whatsapp",
  "to": "<TEST_PHONE_NUMBER>",
  "type": "text",
  "text": { "body": "FitFlow test message — please ignore" }
}
```

### Send Test Template Message
```
POST /{PHONE_NUMBER_ID}/messages

Body:
{
  "messaging_product": "whatsapp",
  "to": "<TEST_PHONE_NUMBER>",
  "type": "template",
  "template": {
    "name": "fitflow_workout_rest_day",
    "language": { "code": "en" },
    "components": [{
      "type": "body",
      "parameters": [
        { "type": "text", "text": "Alex" },
        { "type": "text", "text": "Sam" }
      ]
    }]
  }
}
```

### List Flows
```
GET /{BUSINESS_ACCOUNT_ID}/flows
```

### Verify Webhook Subscription
```
GET /{APP_ID}/subscriptions
```
Expected: Shows `webhooks` subscription with your API URL.

## Step 4: Webhook Testing

To test webhook delivery without a live phone:

1. Use the [Webhooks Testing Tool](https://developers.facebook.com/tools/debug/webhooks/) in Meta Developer Dashboard
2. Select "WhatsApp Business Account" > "messages"
3. Send test events to your webhook URL

## Troubleshooting

| Issue | Check |
|-------|-------|
| 401 Unauthorized | Token expired — regenerate in Graph Explorer |
| Template not found | Run `POST /meta-templates/register` to sync templates |
| Webhook not receiving | Verify URL in App Dashboard > Webhooks > WhatsApp Business Account |
| Flow not working | Check flow status via `GET /{WABA_ID}/flows` — must be `PUBLISHED` |
| Message not delivered | Check phone number format (country code, no +) |
