import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { requireTier } from "../middleware/subscription";
import stripe, { createCheckoutSession } from "../lib/stripe";
import { prisma } from "../lib/prisma";
import { env } from "../lib/env";
import { onboardingQueue } from "../lib/queue";
import { JobType } from "../lib/types";
import { logEvent, EventType } from "../lib/event-logger";
import { getChannel, getRecipientId } from "../lib/channels/channel-router";
import { TemplateId } from "@fitflow/shared";

const router: Router = Router();

// POST /payments/checkout - Create a Stripe checkout session for a client
router.post("/checkout", authenticate, requireTier("STARTER", "PRO", "STUDIO"), async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const { clientId, amount: overrideAmount, currency: overrideCurrency } = req.body;

    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const [client, coach] = await Promise.all([
            prisma.client.findFirst({ where: { id: clientId, coachId } }),
            prisma.coach.findUnique({
                where: { id: coachId },
                select: { stripeAccountId: true, defaultMonthlyRate: true, billingCurrency: true },
            }),
        ]);

        if (!client) return res.status(404).json({ error: "Client not found" });

        if (!coach?.stripeAccountId) {
            return res.status(400).json({
                error: "Connect your Stripe account before accepting payments. Go to Settings > Integrations.",
                code: "STRIPE_NOT_CONNECTED",
            });
        }

        // Resolve payment amount: explicit override > client rate > coach default
        const amountCents = overrideAmount
            ? Math.round(Number(overrideAmount))
            : client.monthlyRate ?? coach.defaultMonthlyRate ?? null;

        if (!amountCents || amountCents <= 0) {
            return res.status(400).json({
                error: "No payment amount configured. Set a rate on the client or in your coach settings.",
                code: "NO_AMOUNT_CONFIGURED",
            });
        }

        const currency = overrideCurrency || coach.billingCurrency || "gbp";
        const successUrl = `${env.WEB_URL}/dashboard/clients/${clientId}?payment=success`;
        const cancelUrl = `${env.WEB_URL}/dashboard/clients/${clientId}?payment=cancel`;

        const session = await createCheckoutSession(
            clientId,
            coachId,
            coach.stripeAccountId,
            amountCents,
            currency,
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
                amount: amountCents,
                currency,
                status: "PENDING",
            },
            create: {
                clientId,
                stripeSessionId: session.id,
                amount: amountCents,
                currency,
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
router.post("/confirm-bank-transfer", authenticate, requireTier("PRO", "STUDIO"), async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const { clientId, amount, currency, paymentId, force } = req.body;

    if (!coachId) return res.status(401).json({ error: "Unauthorized" });
    if (!clientId) return res.status(400).json({ error: "clientId is required" });

    try {
        const client = await prisma.client.findFirst({
            where: { id: clientId, coachId },
        });

        if (!client) return res.status(404).json({ error: "Client not found" });

        let payment;

        if (paymentId) {
            // Two-step flow: confirm an existing PENDING bank transfer
            const existing = await prisma.payment.findFirst({
                where: { id: paymentId, clientId, status: "PENDING", paymentMethod: "BANK_TRANSFER" },
            });
            if (!existing) return res.status(404).json({ error: "Pending bank transfer not found" });

            payment = await prisma.payment.update({
                where: { id: paymentId },
                data: { status: "SUCCEEDED", confirmedBy: coachId },
            });
        } else {
            // Direct confirmation: create new SUCCEEDED payment
            if (!amount) return res.status(400).json({ error: "amount is required" });

            // Duplicate payment guard
            if (!force) {
                const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                const duplicate = await prisma.payment.findFirst({
                    where: {
                        clientId,
                        paymentMethod: "BANK_TRANSFER",
                        status: "SUCCEEDED",
                        amount: Math.round(amount),
                        createdAt: { gte: twentyFourHoursAgo },
                    },
                });
                if (duplicate) {
                    return res.status(409).json({
                        error: "duplicate_payment",
                        message: "A bank transfer of the same amount was already confirmed for this client in the last 24 hours.",
                        existingPaymentId: duplicate.id,
                        existingPaymentDate: duplicate.createdAt,
                    });
                }
            }

            payment = await prisma.payment.create({
                data: {
                    clientId,
                    amount: Math.round(amount),
                    currency: currency || "gbp",
                    status: "SUCCEEDED",
                    paymentMethod: "BANK_TRANSFER",
                    confirmedBy: coachId,
                },
            });
        }

        // Transition client status if pending payment
        if (client.status === "PENDING_PAYMENT") {
            await prisma.client.update({
                where: { id: clientId },
                data: { status: "INTAKE_SENT" },
            });

            await onboardingQueue.add(JobType.ONBOARDING_INTAKE, {
                clientId: client.id,
                coachId,
            });

            await onboardingQueue.add(JobType.PAYMENT_CONFIRMED, {
                clientId: client.id,
                coachId,
            });
        }

        await logEvent(EventType.BANK_TRANSFER_CONFIRMED, {
            coachId,
            clientId,
            metadata: { paymentId: payment.id, amount: payment.amount, currency: payment.currency },
        });

        res.json({ success: true, payment });
    } catch (error) {
        console.error("[POST /payments/confirm-bank-transfer]", error);
        res.status(500).json({ error: "Failed to confirm bank transfer" });
    }
});

// POST /payments/send-bank-details - Send bank details to a client and create pending payment
router.post("/send-bank-details", authenticate, requireTier("PRO", "STUDIO"), async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const { clientId, amount, bankTransferDetails, currency } = req.body;

    if (!coachId) return res.status(401).json({ error: "Unauthorized" });
    if (!clientId || !amount || !bankTransferDetails) {
        return res.status(400).json({ error: "clientId, amount, and bankTransferDetails are required" });
    }

    try {
        const client = await prisma.client.findFirst({
            where: { id: clientId, coachId },
            include: { coach: { select: { name: true, bankDetails: true } } },
        });

        if (!client) return res.status(404).json({ error: "Client not found" });

        // Send bank details template to client
        const channel = await getChannel(client.preferredChannel, coachId);
        const recipientId = getRecipientId(client);
        const offerName = client.goals || `${client.coach.name}'s Coaching`;

        await channel.sendTemplate(recipientId, TemplateId.SYSTEM_BANK_DETAILS, {
            client_first_name: client.name.split(" ")[0],
            coach_first_name: client.coach.name?.split(" ")[0] ?? "Coach",
            offer_name: offerName,
            bank_transfer_details: bankTransferDetails,
        }, client.id);

        // Save bank details to coach profile if not already saved
        if (!client.coach.bankDetails) {
            await prisma.coach.update({
                where: { id: coachId },
                data: { bankDetails: bankTransferDetails },
            });
        }

        // Create PENDING bank transfer payment
        const payment = await prisma.payment.create({
            data: {
                clientId,
                amount: Math.round(amount),
                currency: currency || "gbp",
                status: "PENDING",
                paymentMethod: "BANK_TRANSFER",
                confirmedBy: coachId,
            },
        });

        await logEvent(EventType.BANK_TRANSFER_SENT, {
            coachId,
            clientId,
            channel: client.preferredChannel,
            metadata: { paymentId: payment.id, amount: Math.round(amount) },
        });

        res.json({ success: true, payment });
    } catch (error) {
        console.error("[POST /payments/send-bank-details]", error);
        res.status(500).json({ error: "Failed to send bank details" });
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
        const payment = await prisma.payment.findFirst({
            where: { id: paymentId, client: { coachId } },
            include: {
                client: {
                    include: { coach: { select: { name: true, stripeAccountId: true, billingCurrency: true } } },
                },
            },
        });

        if (!payment) {
            return res.status(404).json({ error: "Payment not found" });
        }

        const client = payment.client;

        if (payment.status !== "PENDING") {
            return res.status(400).json({ error: "Can only remind for pending payments" });
        }

        if (!client.coach.stripeAccountId) {
            return res.status(400).json({
                error: "Connect your Stripe account before sending payment reminders.",
                code: "STRIPE_NOT_CONNECTED",
            });
        }

        const successUrl = `${env.WEB_URL}/dashboard/clients/${client.id}?payment=success`;
        const cancelUrl = `${env.WEB_URL}/dashboard/clients/${client.id}?payment=cancel`;
        const session = await createCheckoutSession(
            client.id,
            coachId,
            client.coach.stripeAccountId,
            payment.amount,
            payment.currency,
            successUrl,
            cancelUrl
        );

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

// GET /payments/:paymentId/receipt - Get receipt (Stripe URL or HTML for bank transfers)
router.get("/:paymentId/receipt", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const paymentId = req.params.paymentId as string;
    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const payment = await prisma.payment.findFirst({
            where: { id: paymentId, client: { coachId } },
            include: {
                client: {
                    include: { coach: { select: { name: true, businessName: true } } },
                },
            },
        });

        if (!payment) {
            return res.status(404).json({ error: "Payment not found" });
        }

        // Bank transfer: return HTML receipt
        if (payment.paymentMethod === "BANK_TRANSFER" || !payment.stripeSessionId) {
            const amountFormatted = (payment.amount / 100).toFixed(2);
            const currencySymbol = payment.currency.toUpperCase() === "GBP" ? "\u00a3" : payment.currency.toUpperCase() + " ";
            const dateFormatted = payment.createdAt.toLocaleDateString("en-GB", {
                day: "numeric", month: "long", year: "numeric",
            });
            const coachDisplay = payment.client.coach.businessName || payment.client.coach.name || "Coach";

            const esc = (s: string) =>
                s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

            const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Payment Receipt</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;max-width:600px;margin:40px auto;padding:20px;color:#1a1a1a}
h1{font-size:20px;margin-bottom:24px;padding-bottom:12px;border-bottom:2px solid #111}
.row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee}
.row:last-child{border-bottom:none}
.label{color:#666;font-size:14px}
.value{font-weight:600;font-size:14px;text-align:right}
.amount{font-size:24px;font-weight:700;margin:20px 0;text-align:center;padding:16px;background:#f8f8f8;border-radius:8px}
.footer{margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:12px;color:#999;text-align:center}
@media print{body{margin:0;padding:20px}}
</style></head><body>
<h1>Payment Receipt</h1>
<div class="amount">${esc(currencySymbol)}${esc(amountFormatted)}</div>
<div class="row"><span class="label">Client</span><span class="value">${esc(payment.client.name)}</span></div>
<div class="row"><span class="label">Coach</span><span class="value">${esc(coachDisplay)}</span></div>
<div class="row"><span class="label">Method</span><span class="value">Bank Transfer</span></div>
<div class="row"><span class="label">Status</span><span class="value">${esc(payment.status === "SUCCEEDED" ? "Paid" : payment.status)}</span></div>
<div class="row"><span class="label">Date</span><span class="value">${esc(dateFormatted)}</span></div>
<div class="row"><span class="label">Reference</span><span class="value" style="font-size:11px">${esc(payment.id)}</span></div>
<div class="footer">Generated by FitFlow</div>
</body></html>`;

            return res.status(200).header("Content-Type", "text/html").send(html);
        }

        // Stripe: return receipt URL
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
