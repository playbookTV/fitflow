import "dotenv/config";
import { z } from "zod";

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
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1),
    STRIPE_SUBSCRIPTION_WEBHOOK_SECRET: z.string().min(1),
    TG_WEBHOOK_SECRET: z.string().min(1),
    ANTHROPIC_API_KEY: z.string().min(1),
    PLATFORM_ADMIN_IDS: z.string().default(""),
    REDIS_URL: z.string().default("redis://localhost:6379"),
    WEB_URL: z.string().default("http://localhost:3000"),
    PREVIEW_URL: z.string().url().optional(),
    PORT: z.coerce.number().int().default(3001),
    NODE_ENV: z.string().default("development"),
    SENTRY_DSN: z.string().url().optional(),
    SENTRY_ENVIRONMENT: z.string().optional(),
    SENTRY_RELEASE: z.string().optional(),
    SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).optional(),
});

export const env = envSchema.parse(process.env);
