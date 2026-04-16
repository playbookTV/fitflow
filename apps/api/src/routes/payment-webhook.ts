import crypto from "node:crypto";
import express, { Router, Request, Response } from "express";
import { verifyWebhook } from "../lib/stripe";
import { prisma } from "../lib/prisma";
import { onboardingQueue } from "../lib/queue";
import { JobType } from "../lib/types";
import { logEvent, EventType } from "../lib/event-logger";

const router: Router = Router();

// POST /payments/webhook - Stripe Webhook Handler (No authentication, uses signature)
router.post("/webhook", express.raw({ type: "application/json" }), async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"] as string;

    try {
        const event = verifyWebhook(req.body, sig);

        if (event.type === "checkout.session.completed") {
            const session = event.data.object as any;
            const clientId = session.metadata.clientId;
            const amount = session.amount_total ?? 0;
            const currency = session.currency ?? "gbp";

            // Atomically check-and-upsert inside a transaction to prevent concurrent
            // Stripe retries from double-enqueuing onboarding jobs.
            const isNew = await prisma.$transaction(async (tx) => {
                const existing = await tx.payment.findUnique({
                    where: { stripeSessionId: session.id },
                });

                await tx.payment.upsert({
                    where: { stripeSessionId: session.id },
                    update: {
                        amount,
                        currency,
                        status: "SUCCEEDED",
                    },
                    create: {
                        clientId,
                        stripeSessionId: session.id,
                        amount,
                        currency,
                        status: "SUCCEEDED",
                    },
                });

                return !existing;
            });

            if (isNew) {
                // Transition state: PENDING_PAYMENT -> INTAKE_SENT
                const intakeToken = crypto.randomUUID();
                const client = await prisma.client.update({
                    where: { id: clientId, status: "PENDING_PAYMENT" },
                    data: { status: "INTAKE_SENT", intakeToken },
                });

                await onboardingQueue.add(JobType.ONBOARDING_INTAKE, {
                    clientId: client.id,
                    coachId: client.coachId,
                    intakeToken,
                });

                await onboardingQueue.add(JobType.PAYMENT_CONFIRMED, {
                    clientId: client.id,
                    coachId: client.coachId,
                });

                await logEvent(EventType.PAYMENT_CONFIRMED, {
                    coachId: client.coachId,
                    clientId: client.id,
                    metadata: { stripeSessionId: session.id },
                });

                console.log(`[Stripe Webhook] Client ${clientId} transitions to INTAKE_SENT. Onboarding enqueued.`);
            } else {
                console.log(`[Stripe Webhook] Duplicate event for session ${session.id} — skipping onboarding enqueue.`);
            }
        }

        res.json({ received: true });
    } catch (err: any) {
        console.error("[Stripe Webhook Error]", err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
});

export default router;
