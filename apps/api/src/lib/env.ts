import "dotenv/config";
import { z } from "zod";

// Treat empty strings as undefined — Railway passes unset vars as `""`, which
// would fail `.url()` / `.optional()` validations and crash the process at boot.
const optionalUrl = z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().url().optional(),
);
const optionalString = z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().optional(),
);
const optionalNumber = z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.coerce.number().min(0).max(1).optional(),
);

const envSchema = z.object({
    DATABASE_URL: z.string().min(1),
    DIRECT_URL: z.string().min(1),
    SUPABASE_URL: z.string().min(1),
    SUPABASE_SERVICE_KEY: z.string().min(1),
    META_WHATSAPP_ACCESS_TOKEN: z.string().min(1),
    META_WHATSAPP_PHONE_NUMBER_ID: z.string().min(1),
    META_WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().min(1),
    META_WHATSAPP_VERIFY_TOKEN: z.string().min(1),
    META_APP_SECRET: z.string().min(1),
    META_WHATSAPP_DISPLAY_NUMBER: optionalString,
    WA_CHECKIN_FLOW_ID: optionalString,
    IP_HASH_SALT: z.string().min(16),
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1),
    STRIPE_SUBSCRIPTION_WEBHOOK_SECRET: z.string().min(1),
    PLATFORM_FEE_PERCENT: z.coerce.number().min(0).max(100).default(10),
    TG_WEBHOOK_SECRET: z.string().min(1),
    ANTHROPIC_API_KEY: z.string().min(1),
    PLATFORM_ADMIN_IDS: z.string().default(""),
    REDIS_URL: z.string().default("redis://localhost:6379"),
    WEB_URL: z.string().default("http://localhost:3000"),
    PREVIEW_URL: optionalUrl,
    ALLOWED_ORIGINS: optionalString,
    PORT: z.coerce.number().int().default(3001),
    NODE_ENV: z.string().default("development"),
    SENTRY_DSN: optionalUrl,
    SENTRY_ENVIRONMENT: optionalString,
    SENTRY_RELEASE: optionalString,
    SENTRY_TRACES_SAMPLE_RATE: optionalNumber,
});

export const env = envSchema.parse(process.env);
