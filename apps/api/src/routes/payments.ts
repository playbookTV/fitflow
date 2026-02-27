import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { createCheckoutSession } from "../lib/stripe";
import { prisma } from "../lib/prisma";

const router: Router = Router();

// POST /payments/checkout - Create a checkout session for a client
router.post("/checkout", authenticate, async (req: AuthRequest, res: Response) => {
    const trainerId = req.user?.id as string;
    const { clientId } = req.body;

    if (!trainerId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const client = await prisma.client.findFirst({
            where: { id: clientId, trainerId },
        });

        if (!client) return res.status(404).json({ error: "Client not found" });

        const successUrl = `${process.env.WEB_URL}/dashboard/clients/${clientId}?payment=success`;
        const cancelUrl = `${process.env.WEB_URL}/dashboard/clients/${clientId}?payment=cancel`;

        const session = await createCheckoutSession(
            clientId,
            trainerId,
            successUrl,
            cancelUrl
        );

        res.json({ url: session.url });
    } catch (error) {
        console.error("[POST /payments/checkout]", error);
        res.status(500).json({ error: "Failed to create checkout session" });
    }
});

export default router;
