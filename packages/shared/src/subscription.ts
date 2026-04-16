export type SubscriptionTier = "STARTER" | "PRO" | "STUDIO";
export type SubscriptionStatus = "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "UNPAID" | "INCOMPLETE";
export type BillingInterval = "MONTHLY" | "ANNUAL";

export interface TierLimits {
    maxClients: number;
    maxChannels: number;
    maxBots: number;
    analytics: boolean;
    paymentCollection: boolean;
    checkinSequences: boolean;
    whiteLabel: boolean;
}

/** -1 means unlimited */
export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
    STARTER: {
        maxClients: 10,
        maxChannels: 1,
        maxBots: 1,
        analytics: false,
        paymentCollection: false,
        checkinSequences: false,
        whiteLabel: false,
    },
    PRO: {
        maxClients: 30,
        maxChannels: 2,
        maxBots: -1,
        analytics: true,
        paymentCollection: true,
        checkinSequences: true,
        whiteLabel: false,
    },
    STUDIO: {
        maxClients: 75,
        maxChannels: 2,
        maxBots: -1,
        analytics: true,
        paymentCollection: true,
        checkinSequences: true,
        whiteLabel: true,
    },
};

export type BillingCurrency = "usd" | "gbp";

export interface TierPricing {
    monthly: number; // in cents
    annual: number;  // in cents (per month, billed annually)
}

export const TIER_PRICING: Record<BillingCurrency, Record<SubscriptionTier, TierPricing>> = {
    usd: {
        STARTER: { monthly: 1900, annual: 1500 },
        PRO:     { monthly: 4900, annual: 3900 },
        STUDIO:  { monthly: 9900, annual: 7900 },
    },
    gbp: {
        STARTER: { monthly: 1500, annual: 1200 },
        PRO:     { monthly: 3900, annual: 3100 },
        STUDIO:  { monthly: 7900, annual: 6300 },
    },
};

export const TIER_ORDER: SubscriptionTier[] = ["STARTER", "PRO", "STUDIO"];

export const TRIAL_DAYS = 7;
