import type { SubscriptionTier, BillingInterval, BillingCurrency } from "@fitflow/shared";

/**
 * Maps tier + interval + currency to a Stripe Price ID from environment variables.
 * Price IDs are set in Stripe Dashboard and stored as env vars.
 */
const STRIPE_PRICE_MAP: Record<BillingCurrency, Record<SubscriptionTier, Record<BillingInterval, string>>> = {
    usd: {
        STARTER: {
            MONTHLY: process.env.STRIPE_PRICE_STARTER_USD_MONTHLY || "",
            ANNUAL:  process.env.STRIPE_PRICE_STARTER_USD_ANNUAL || "",
        },
        PRO: {
            MONTHLY: process.env.STRIPE_PRICE_PRO_USD_MONTHLY || "",
            ANNUAL:  process.env.STRIPE_PRICE_PRO_USD_ANNUAL || "",
        },
        STUDIO: {
            MONTHLY: process.env.STRIPE_PRICE_STUDIO_USD_MONTHLY || "",
            ANNUAL:  process.env.STRIPE_PRICE_STUDIO_USD_ANNUAL || "",
        },
    },
    gbp: {
        STARTER: {
            MONTHLY: process.env.STRIPE_PRICE_STARTER_GBP_MONTHLY || "",
            ANNUAL:  process.env.STRIPE_PRICE_STARTER_GBP_ANNUAL || "",
        },
        PRO: {
            MONTHLY: process.env.STRIPE_PRICE_PRO_GBP_MONTHLY || "",
            ANNUAL:  process.env.STRIPE_PRICE_PRO_GBP_ANNUAL || "",
        },
        STUDIO: {
            MONTHLY: process.env.STRIPE_PRICE_STUDIO_GBP_MONTHLY || "",
            ANNUAL:  process.env.STRIPE_PRICE_STUDIO_GBP_ANNUAL || "",
        },
    },
};

export function getStripePriceId(
    tier: SubscriptionTier,
    interval: BillingInterval,
    currency: BillingCurrency
): string {
    const priceId = STRIPE_PRICE_MAP[currency]?.[tier]?.[interval];
    if (!priceId) {
        throw new Error(`No Stripe Price ID configured for ${tier}/${interval}/${currency}`);
    }
    return priceId;
}

/**
 * Reverse-lookup: given a Stripe Price ID, determine the tier and interval.
 */
export function tierFromPriceId(priceId: string): { tier: SubscriptionTier; interval: BillingInterval } | null {
    for (const currency of Object.keys(STRIPE_PRICE_MAP) as BillingCurrency[]) {
        for (const tier of Object.keys(STRIPE_PRICE_MAP[currency]) as SubscriptionTier[]) {
            for (const interval of Object.keys(STRIPE_PRICE_MAP[currency][tier]) as BillingInterval[]) {
                if (STRIPE_PRICE_MAP[currency][tier][interval] === priceId) {
                    return { tier, interval };
                }
            }
        }
    }
    return null;
}
