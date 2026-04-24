import Stripe from "stripe";
import { env } from "./env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-02-24.acacia",
});

// Platform fee percentage taken from each client payment (goes to FitFlow)
export const PLATFORM_FEE_PERCENT = 10;

export const createCheckoutSession = async (
    clientId: string,
    coachId: string,
    coachStripeAccountId: string,
    amountCents: number,
    currency: string,
    successUrl: string,
    cancelUrl: string
) => {
    return await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
            {
                price_data: {
                    currency,
                    product_data: {
                        name: "FitFlow Personal Training Subscription",
                        description: "Monthly coaching and workout plans",
                    },
                    unit_amount: amountCents,
                    recurring: {
                        interval: "month",
                    },
                },
                quantity: 1,
            },
        ],
        mode: "subscription",
        // Route funds to the coach's connected Stripe account with a platform fee
        subscription_data: {
            transfer_data: {
                destination: coachStripeAccountId,
            },
            application_fee_percent: PLATFORM_FEE_PERCENT,
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
            clientId,
            coachId,
        },
        client_reference_id: clientId,
    });
};

export const createConnectAccount = async (coachId: string, email: string) => {
    return await stripe.accounts.create({
        type: "express",
        email,
        metadata: { coachId },
        capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
        },
    });
};

export const createAccountLink = async (
    accountId: string,
    refreshUrl: string,
    returnUrl: string
) => {
    return await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: "account_onboarding",
    });
};

export const createLoginLink = async (accountId: string) => {
    return await stripe.accounts.createLoginLink(accountId);
};

export const verifyWebhook = (payload: string | Buffer, signature: string) => {
    return stripe.webhooks.constructEvent(
        payload,
        signature,
        env.STRIPE_WEBHOOK_SECRET
    );
};

// ═══════════════════════════════════════════════════════════════
// COACH SUBSCRIPTION BILLING (SaaS — coaches pay FitFlow)
// ═══════════════════════════════════════════════════════════════

export const createStripeCustomer = async (
    coachId: string,
    email: string,
    currency: string = "usd"
) => {
    return await stripe.customers.create({
        email,
        metadata: { coachId, billingCurrency: currency },
    });
};

export const createSubscriptionCheckout = async (
    customerId: string,
    priceId: string,
    trialDays: number,
    successUrl: string,
    cancelUrl: string
) => {
    return await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        subscription_data: {
            trial_period_days: trialDays,
        },
        allow_promotion_codes: true,
        success_url: successUrl,
        cancel_url: cancelUrl,
    });
};

export const createCustomerPortalSession = async (
    customerId: string,
    returnUrl: string
) => {
    return await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
    });
};

export const verifySubscriptionWebhook = (
    payload: string | Buffer,
    signature: string
) => {
    return stripe.webhooks.constructEvent(
        payload,
        signature,
        env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET
    );
};

export default stripe;
