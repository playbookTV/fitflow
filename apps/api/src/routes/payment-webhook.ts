import express, { Router, Request, Response } from "express";
import { verifyWebhook } from "../lib/stripe";
import { prisma } from "../lib/prisma";
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

            // Transition state: PENDING_PAYMENT -> INTAKE_SENT
            const client = await prisma.client.update({
                where: { id: clientId },
                data: { status: "INTAKE_SENT" },
            });

            // Enqueue the first intake Flow
            const { onboardingQueue } = require("../lib/queue");
            const { JobType } = require("../lib/types");

            await onboardingQueue.add(JobType.ONBOARDING_INTAKE, {
                clientId: client.id,
                coachId: client.coachId,
            });

            await logEvent(EventType.PAYMENT_CONFIRMED, {
                coachId: client.coachId,
                clientId: client.id,
                metadata: { stripeSessionId: session.id },
            });

            console.log(`[Stripe Webhook] Client ${clientId} transitions to INTAKE_SENT. Onboarding enqueued.`);
        }

        res.json({ received: true });
    } catch (err: any) {
        console.error("[Stripe Webhook Error]", err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
});

export default router;
