import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import stripe, {
    createStripeCustomer,
    createSubscriptionCheckout,
    createCustomerPortalSession,
} from "../lib/stripe";
import { prisma } from "../lib/prisma";
import { env } from "../lib/env";
import { getStripePriceId } from "../lib/subscription-tiers";
import {
    TIER_LIMITS,
    TIER_PRICING,
    TIER_ORDER,
    TRIAL_DAYS,
    type SubscriptionTier,
    type BillingInterval,
    type BillingCurrency,
} from "@fitflow/shared";

const router: Router = Router();

// GET /subscriptions/tiers — all tiers with pricing and feature limits
router.get("/tiers", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;

    try {
        const coach = await prisma.coach.findUnique({
            where: { id: coachId },
            select: { billingCurrency: true },
        });

        const currency = (coach?.billingCurrency || "usd") as BillingCurrency;

        const tiers = TIER_ORDER.map((tier) => ({
            tier,
            limits: TIER_LIMITS[tier],
            pricing: TIER_PRICING[currency][tier],
            currency,
        }));

        res.json({ tiers });
    } catch (err: any) {
        console.error("[Subscriptions] Error fetching tiers:", err);
        res.status(500).json({ error: "Failed to fetch tiers" });
    }
});

// GET /subscriptions/status — current subscription + usage counts
router.get("/status", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;

    try {
        const [subscription, clientCount, planCount, mealPlanCount, offerCount] = await Promise.all([
            prisma.subscription.findUnique({ where: { coachId } }),
            prisma.client.count({ where: { coachId } }),
            prisma.workoutPlan.count({ where: { coachId } }),
            prisma.mealPlan.count({ where: { coachId } }),
            prisma.offer.count({ where: { coachId } }),
        ]);

        if (!subscription) {
            return res.json({
                subscribed: false,
                usage: { clients: clientCount, plans: planCount, mealPlans: mealPlanCount, offers: offerCount },
            });
        }

        const limits = TIER_LIMITS[subscription.tier as SubscriptionTier];
        const trialDaysLeft = subscription.trialEnd
            ? Math.max(0, Math.ceil((subscription.trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
            : 0;

        res.json({
            subscribed: true,
            tier: subscription.tier,
            status: subscription.status,
            billingInterval: subscription.billingInterval,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            isTrialing: subscription.status === "TRIALING",
            trialEnd: subscription.trialEnd,
            trialDaysLeft,
            limits,
            usage: {
                clients: clientCount,
                plans: planCount,
                mealPlans: mealPlanCount,
                offers: offerCount,
            },
        });
    } catch (err: any) {
        console.error("[Subscriptions] Error fetching status:", err);
        res.status(500).json({ error: "Failed to fetch subscription status" });
    }
});

// POST /subscriptions/checkout — create Stripe Checkout session for subscribing
router.post("/checkout", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const { tier, interval } = req.body as { tier: SubscriptionTier; interval: BillingInterval };

    if (!tier || !TIER_ORDER.includes(tier)) {
        return res.status(400).json({ error: "Invalid tier" });
    }

    const billingInterval: BillingInterval = interval === "ANNUAL" ? "ANNUAL" : "MONTHLY";

    try {
        const coach = await prisma.coach.findUnique({ where: { id: coachId } });
        if (!coach) return res.status(404).json({ error: "Coach not found" });

        // Ensure coach has a Stripe Customer
        let customerId = coach.stripeCustomerId;
        if (!customerId) {
            const customer = await createStripeCustomer(coachId, coach.email, coach.billingCurrency);
            await prisma.coach.update({
                where: { id: coachId },
                data: { stripeCustomerId: customer.id },
            });
            customerId = customer.id;
        }

        // Check if already subscribed
        const existing = await prisma.subscription.findUnique({ where: { coachId } });
        if (existing && existing.status !== "CANCELED") {
            return res.status(409).json({ error: "Already subscribed. Use /subscriptions/change to switch plans." });
        }

        const currency = coach.billingCurrency as BillingCurrency;
        const priceId = getStripePriceId(tier, billingInterval, currency);
        const successUrl = `${env.WEB_URL}/dashboard/subscription?checkout=success`;
        const cancelUrl = `${env.WEB_URL}/dashboard/subscription?checkout=cancel`;

        const session = await createSubscriptionCheckout(
            customerId,
            priceId,
            TRIAL_DAYS,
            successUrl,
            cancelUrl
        );

        res.json({ url: session.url });
    } catch (err: any) {
        console.error("[Subscriptions] Checkout error:", err);
        res.status(500).json({ error: "Failed to create checkout session" });
    }
});

// POST /subscriptions/portal — open Stripe Customer Portal
router.post("/portal", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;

    try {
        const coach = await prisma.coach.findUnique({
            where: { id: coachId },
            select: { stripeCustomerId: true },
        });

        if (!coach?.stripeCustomerId) {
            return res.status(400).json({ error: "No billing account found" });
        }

        const returnUrl = `${env.WEB_URL}/dashboard/subscription`;
        const session = await createCustomerPortalSession(coach.stripeCustomerId, returnUrl);

        res.json({ url: session.url });
    } catch (err: any) {
        console.error("[Subscriptions] Portal error:", err);
        res.status(500).json({ error: "Failed to create portal session" });
    }
});

// POST /subscriptions/change — upgrade or downgrade
router.post("/change", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const { tier, interval } = req.body as { tier: SubscriptionTier; interval?: BillingInterval };

    if (!tier || !TIER_ORDER.includes(tier)) {
        return res.status(400).json({ error: "Invalid tier" });
    }

    try {
        const subscription = await prisma.subscription.findUnique({ where: { coachId } });
        if (!subscription || subscription.status === "CANCELED") {
            return res.status(400).json({ error: "No active subscription. Use /subscriptions/checkout." });
        }

        const coach = await prisma.coach.findUnique({ where: { id: coachId } });
        if (!coach) return res.status(404).json({ error: "Coach not found" });

        const billingInterval: BillingInterval = interval || (subscription.billingInterval as BillingInterval);
        const currency = coach.billingCurrency as BillingCurrency;
        const newPriceId = getStripePriceId(tier, billingInterval, currency);

        // Get the current Stripe subscription to find the item ID
        const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
        const itemId = stripeSubscription.items.data[0]?.id;

        if (!itemId) {
            return res.status(500).json({ error: "Subscription item not found" });
        }

        const updated = await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
            items: [{ id: itemId, price: newPriceId }],
            proration_behavior: "create_prorations",
        });

        // Local record will be updated via webhook, but return optimistic response
        res.json({
            message: `Plan changed to ${tier}`,
            effectiveDate: new Date(updated.current_period_start * 1000),
        });
    } catch (err: any) {
        console.error("[Subscriptions] Change error:", err);
        res.status(500).json({ error: "Failed to change plan" });
    }
});

// GET /subscriptions/invoices — list Stripe invoices
router.get("/invoices", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;

    try {
        const coach = await prisma.coach.findUnique({
            where: { id: coachId },
            select: { stripeCustomerId: true },
        });

        if (!coach?.stripeCustomerId) {
            return res.json({ invoices: [] });
        }

        const invoices = await stripe.invoices.list({
            customer: coach.stripeCustomerId,
            limit: 24,
        });

        const formatted = invoices.data.map((inv) => ({
            id: inv.id,
            amount: inv.amount_paid,
            currency: inv.currency,
            status: inv.status,
            created: new Date(inv.created * 1000),
            hostedUrl: inv.hosted_invoice_url,
            pdfUrl: inv.invoice_pdf,
        }));

        res.json({ invoices: formatted });
    } catch (err: any) {
        console.error("[Subscriptions] Invoices error:", err);
        res.status(500).json({ error: "Failed to fetch invoices" });
    }
});

export default router;
