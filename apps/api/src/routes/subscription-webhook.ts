import express, { Router, Request, Response } from "express";
import { verifySubscriptionWebhook } from "../lib/stripe";
import { prisma } from "../lib/prisma";
import { SubscriptionStatus as PrismaSubscriptionStatus, SubscriptionTier as PrismaTier } from "@prisma/client";
import { tierFromPriceId } from "../lib/subscription-tiers";
import { logEvent, EventType } from "../lib/event-logger";
import type { SubscriptionTier } from "@fitflow/shared";
import { TIER_ORDER } from "@fitflow/shared";

const router: Router = Router();

// POST /subscriptions/webhook — Stripe subscription webhook (raw body, no auth)
router.post("/webhook", express.raw({ type: "application/json" }), async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"] as string;

    try {
        const event = verifySubscriptionWebhook(req.body, sig);

        switch (event.type) {
            case "customer.subscription.created":
            case "customer.subscription.updated": {
                const sub = event.data.object as any;
                const customerId = sub.customer as string;
                const priceId = sub.items?.data?.[0]?.price?.id;

                const coach = await prisma.coach.findUnique({
                    where: { stripeCustomerId: customerId },
                });

                if (!coach) {
                    console.error(`[Sub Webhook] No coach found for customer ${customerId}`);
                    break;
                }

                const resolved = priceId ? tierFromPriceId(priceId) : null;
                const tier = (resolved?.tier || "STARTER") as PrismaTier;
                const billingInterval = resolved?.interval || "MONTHLY";

                const status = mapStripeStatus(sub.status);

                // Period dates live on the subscription item in recent Stripe API versions
                const item = sub.items?.data?.[0];
                const periodStart = item?.current_period_start ?? sub.current_period_start;
                const periodEnd = item?.current_period_end ?? sub.current_period_end;

                const currentPeriodStart = periodStart
                    ? new Date(periodStart * 1000)
                    : new Date();
                const currentPeriodEnd = periodEnd
                    ? new Date(periodEnd * 1000)
                    : new Date();

                const existingSub = await prisma.subscription.findUnique({
                    where: { coachId: coach.id },
                });

                await prisma.subscription.upsert({
                    where: { coachId: coach.id },
                    update: {
                        stripeSubscriptionId: sub.id,
                        stripePriceId: priceId || "",
                        tier,
                        billingInterval,
                        status,
                        currentPeriodStart,
                        currentPeriodEnd,
                        cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
                        trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
                    },
                    create: {
                        coachId: coach.id,
                        stripeSubscriptionId: sub.id,
                        stripePriceId: priceId || "",
                        tier,
                        billingInterval,
                        status,
                        currentPeriodStart,
                        currentPeriodEnd,
                        cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
                        trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
                    },
                });

                // Log upgrade/downgrade events
                if (event.type === "customer.subscription.updated" && existingSub) {
                    const oldIdx = TIER_ORDER.indexOf(existingSub.tier as SubscriptionTier);
                    const newIdx = TIER_ORDER.indexOf(tier);
                    if (newIdx > oldIdx) {
                        await logEvent(EventType.SUBSCRIPTION_UPGRADED, {
                            coachId: coach.id,
                            metadata: { from: existingSub.tier, to: tier },
                        });
                    } else if (newIdx < oldIdx) {
                        await logEvent(EventType.SUBSCRIPTION_DOWNGRADED, {
                            coachId: coach.id,
                            metadata: { from: existingSub.tier, to: tier },
                        });
                    }
                } else if (event.type === "customer.subscription.created") {
                    await logEvent(EventType.SUBSCRIPTION_CREATED, {
                        coachId: coach.id,
                        metadata: { tier, billingInterval },
                    });
                }

                console.log(`[Sub Webhook] ${event.type} — coach ${coach.id}, tier ${tier}, status ${status}`);
                break;
            }

            case "customer.subscription.deleted": {
                const sub = event.data.object as any;
                const customerId = sub.customer as string;

                const coach = await prisma.coach.findUnique({
                    where: { stripeCustomerId: customerId },
                });

                if (coach) {
                    await prisma.subscription.updateMany({
                        where: { coachId: coach.id },
                        data: { status: "CANCELED" },
                    });

                    await logEvent(EventType.SUBSCRIPTION_CANCELED, {
                        coachId: coach.id,
                    });

                    console.log(`[Sub Webhook] Subscription canceled for coach ${coach.id}`);
                }
                break;
            }

            case "invoice.payment_succeeded": {
                const invoice = event.data.object as any;
                const customerId = invoice.customer as string;
                const subscriptionId = invoice.subscription as string;

                if (subscriptionId) {
                    const coach = await prisma.coach.findUnique({
                        where: { stripeCustomerId: customerId },
                    });

                    if (coach) {
                        // If was PAST_DUE, restore to ACTIVE
                        await prisma.subscription.updateMany({
                            where: { coachId: coach.id, status: "PAST_DUE" },
                            data: { status: "ACTIVE" },
                        });

                        await logEvent(EventType.SUBSCRIPTION_RENEWED, {
                            coachId: coach.id,
                            metadata: { invoiceId: invoice.id, amount: invoice.amount_paid },
                        });
                    }
                }
                break;
            }

            case "invoice.payment_failed": {
                const invoice = event.data.object as any;
                const customerId = invoice.customer as string;
                const subscriptionId = invoice.subscription as string;

                if (subscriptionId) {
                    const coach = await prisma.coach.findUnique({
                        where: { stripeCustomerId: customerId },
                    });

                    if (coach) {
                        await prisma.subscription.updateMany({
                            where: { coachId: coach.id },
                            data: { status: "PAST_DUE" },
                        });

                        await logEvent(EventType.SUBSCRIPTION_PAYMENT_FAILED, {
                            coachId: coach.id,
                            metadata: { invoiceId: invoice.id },
                        });

                        console.log(`[Sub Webhook] Payment failed for coach ${coach.id}`);
                    }
                }
                break;
            }

            case "customer.subscription.trial_will_end": {
                const sub = event.data.object as any;
                const customerId = sub.customer as string;

                const coach = await prisma.coach.findUnique({
                    where: { stripeCustomerId: customerId },
                });

                if (coach) {
                    await logEvent(EventType.SUBSCRIPTION_TRIAL_ENDING, {
                        coachId: coach.id,
                        metadata: { trialEnd: sub.trial_end },
                    });

                    console.log(`[Sub Webhook] Trial ending soon for coach ${coach.id}`);
                }
                break;
            }
        }

        res.json({ received: true });
    } catch (err: any) {
        console.error("[Sub Webhook Error]", err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
});

function mapStripeStatus(status: string): PrismaSubscriptionStatus {
    const map: Record<string, PrismaSubscriptionStatus> = {
        trialing: "TRIALING",
        active: "ACTIVE",
        past_due: "PAST_DUE",
        canceled: "CANCELED",
        unpaid: "UNPAID",
        incomplete: "INCOMPLETE",
        incomplete_expired: "CANCELED",
    };
    return map[status] || "INCOMPLETE";
}

export default router;
