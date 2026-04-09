import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import stripe, { createCheckoutSession } from "../lib/stripe";
import { prisma } from "../lib/prisma";
import { onboardingQueue } from "../lib/queue";
import { JobType } from "../lib/types";
import { logEvent, EventType } from "../lib/event-logger";
import { getChannel, getRecipientId } from "../lib/channels/channel-router";
import { TemplateId } from "@fitflow/shared";

const router: Router = Router();

// POST /payments/checkout - Create a Stripe checkout session for a client
router.post("/checkout", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const { clientId } = req.body;

    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const client = await prisma.client.findFirst({
            where: { id: clientId, coachId },
        });

        if (!client) return res.status(404).json({ error: "Client not found" });

        const successUrl = `${process.env.WEB_URL}/dashboard/clients/${clientId}?payment=success`;
        const cancelUrl = `${process.env.WEB_URL}/dashboard/clients/${clientId}?payment=cancel`;

        const session = await createCheckoutSession(
            clientId,
            coachId,
            successUrl,
            cancelUrl
        );

        if (!session.url) {
            throw new Error("Stripe checkout session did not include a URL");
        }

        await prisma.payment.upsert({
            where: { stripeSessionId: session.id },
            update: {
                clientId,
                amount: session.amount_total ?? 5000,
                currency: session.currency ?? "gbp",
                status: "PENDING",
            },
            create: {
                clientId,
                stripeSessionId: session.id,
                amount: session.amount_total ?? 5000,
                currency: session.currency ?? "gbp",
                status: "PENDING",
            },
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error("[POST /payments/checkout]", error);
        res.status(500).json({ error: "Failed to create checkout session" });
    }
});

// POST /payments/confirm-bank-transfer - Coach manually confirms a bank transfer
router.post("/confirm-bank-transfer", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const { clientId, amount, currency } = req.body;

    if (!coachId) return res.status(401).json({ error: "Unauthorized" });
    if (!clientId || !amount) return res.status(400).json({ error: "clientId and amount are required" });

    try {
        const client = await prisma.client.findFirst({
            where: { id: clientId, coachId },
        });

        if (!client) return res.status(404).json({ error: "Client not found" });

        // Create payment record
        const payment = await prisma.payment.create({
            data: {
                clientId,
                amount: Math.round(amount),
                currency: currency || "gbp",
                status: "SUCCEEDED",
                paymentMethod: "BANK_TRANSFER",
                confirmedBy: coachId,
            },
        });

        // Transition client status if pending payment
        if (client.status === "PENDING_PAYMENT") {
            await prisma.client.update({
                where: { id: clientId },
                data: { status: "INTAKE_SENT" },
            });

            // Enqueue onboarding
            await onboardingQueue.add(JobType.ONBOARDING_INTAKE, {
                clientId: client.id,
                coachId,
            });

            // Send bank transfer confirmed template to the client
            await onboardingQueue.add(JobType.PAYMENT_CONFIRMED, {
                clientId: client.id,
                coachId,
            });
        }

        await logEvent(EventType.BANK_TRANSFER_CONFIRMED, {
            coachId,
            clientId,
            metadata: { paymentId: payment.id, amount, currency: currency || "gbp" },
        });

        res.json({ success: true, payment });
    } catch (error) {
        console.error("[POST /payments/confirm-bank-transfer]", error);
        res.status(500).json({ error: "Failed to confirm bank transfer" });
    }
});

// GET /payments/history - List payment history for the coach
router.get("/history", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const payments = await prisma.payment.findMany({
            where: { client: { coachId } },
            include: { client: { select: { name: true } } },
            orderBy: { createdAt: "desc" },
            take: 100,
        });

        res.json(payments.map((p) => ({
            id: p.id,
            clientId: p.clientId,
            clientName: p.client.name,
            amount: p.amount,
            currency: p.currency,
            status: p.status.toLowerCase(),
            paymentMethod: p.paymentMethod,
            createdAt: p.createdAt,
        })));
    } catch (error) {
        console.error("[GET /payments/history]", error);
        res.status(500).json({ error: "Failed to fetch payment history" });
    }
});

// POST /payments/:paymentId/remind - Send a payment reminder to the client
router.post("/:paymentId/remind", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const paymentId = req.params.paymentId as string;
    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const payment = await prisma.payment.findUnique({
            where: { id: paymentId },
            include: {
                client: {
                    include: { coach: { select: { name: true } } },
                },
            },
        });

        if (!payment) {
            return res.status(404).json({ error: "Payment not found" });
        }

        const client = payment.client;
        if (client.coachId !== coachId) {
            return res.status(404).json({ error: "Payment not found" });
        }

        if (payment.status !== "PENDING") {
            return res.status(400).json({ error: "Can only remind for pending payments" });
        }
        const successUrl = `${process.env.WEB_URL}/dashboard/clients/${client.id}?payment=success`;
        const cancelUrl = `${process.env.WEB_URL}/dashboard/clients/${client.id}?payment=cancel`;
        const session = await createCheckoutSession(client.id, coachId, successUrl, cancelUrl);

        const channel = await getChannel(client.preferredChannel, coachId);
        const recipientId = getRecipientId(client);

        await channel.sendTemplate(recipientId, TemplateId.PAYMENT_REMINDER, {
            client_first_name: client.name.split(" ")[0],
            coach_first_name: client.coach.name?.split(" ")[0] ?? "Coach",
            amount: `£${(payment.amount / 100).toFixed(0)}`,
            payment_link: session.url!,
        });

        await logEvent(EventType.PAYMENT_REMINDER_SENT, {
            coachId,
            clientId: client.id,
            channel: client.preferredChannel,
            metadata: { paymentId: payment.id },
        });

        res.json({ success: true });
    } catch (error) {
        console.error("[POST /payments/:paymentId/remind]", error);
        res.status(500).json({ error: "Failed to send reminder" });
    }
});

// GET /payments/:paymentId/receipt - Get Stripe receipt URL
router.get("/:paymentId/receipt", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const paymentId = req.params.paymentId as string;
    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const payment = await prisma.payment.findUnique({
            where: { id: paymentId },
            include: { client: { select: { coachId: true } } },
        });

        if (!payment || payment.client.coachId !== coachId) {
            return res.status(404).json({ error: "Payment not found" });
        }

        if (payment.paymentMethod === "BANK_TRANSFER" || !payment.stripeSessionId) {
            return res.status(404).json({ error: "No receipt available for this payment" });
        }

        const session = await stripe.checkout.sessions.retrieve(payment.stripeSessionId, {
            expand: ["payment_intent.latest_charge"],
        });

        const paymentIntent = session.payment_intent as any;
        const charge = paymentIntent?.latest_charge;
        const receiptUrl = charge?.receipt_url;

        if (!receiptUrl) {
            return res.status(404).json({ error: "Receipt not yet available" });
        }

        res.json({ receiptUrl });
    } catch (error) {
        console.error("[GET /payments/:paymentId/receipt]", error);
        res.status(500).json({ error: "Failed to fetch receipt" });
    }
});

export default router;
