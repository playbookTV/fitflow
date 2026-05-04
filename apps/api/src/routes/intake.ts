import { Router } from "express";
import { prisma } from "../lib/prisma";

const router: Router = Router();

// POST /intake - Public endpoint for clients/leads to submit their onboarding form
// Requires a valid intake token to prevent unauthorized writes.
router.post("/", async (req, res) => {
    const { clientId, token, goals, medicalNotes, equipment, experience } = req.body;

    if (!clientId || !token) return res.status(400).json({ error: "Missing clientId or token" });

    try {
        // Check clients first, then leads
        const client = await prisma.client.findFirst({
            where: { id: clientId, intakeToken: token }
        });

        if (client) {
            if (client.status !== "INTAKE_SENT") {
                return res.status(409).json({ error: "Intake already completed or not yet available" });
            }

            await prisma.client.update({
                where: { id: clientId },
                data: {
                    goals: goals,
                    notes: `Medical: ${medicalNotes} \nEquipment: ${equipment} \nExperience: ${experience} `,
                    status: "INTAKE_COMPLETE",
                    intakeToken: null,
                }
            });

            console.log(`[Intake] Client ${clientId} completed onboarding.`);
            return res.json({ success: true, message: "Onboarding complete! Your coach will be in touch soon." });
        }

        // Check leads
        const lead = await prisma.lead.findFirst({
            where: { id: clientId, intakeToken: token }
        });

        if (!lead) return res.status(404).json({ error: "Invalid or expired intake link" });

        if (lead.status !== "NEW") {
            return res.status(409).json({ error: "Intake already completed" });
        }

        await prisma.lead.update({
            where: { id: clientId },
            data: {
                intakeData: { goals, medicalNotes, equipment, experience },
                intakeToken: null,
                status: "INTAKE_COMPLETE",
            }
        });

        console.log(`[Intake] Lead ${clientId} completed onboarding.`);
        res.json({ success: true, message: "Onboarding complete! Your coach will be in touch soon." });
    } catch (error) {
        console.error("[Intake Error]", error);
        res.status(500).json({ error: "Failed to save intake data" });
    }
});

// GET /intake/:id - Get client/lead name for the onboarding page
// Requires a valid intake token as a query parameter.
router.get("/:id", async (req, res) => {
    const token = req.query.token as string;

    if (!token) return res.status(400).json({ error: "Missing token" });

    try {
        const client = await prisma.client.findFirst({
            where: { id: req.params.id, intakeToken: token },
            select: { name: true }
        });

        if (client) return res.json(client);

        const lead = await prisma.lead.findFirst({
            where: { id: req.params.id, intakeToken: token },
            select: { name: true }
        });

        if (!lead) return res.status(404).json({ error: "Invalid or expired intake link" });
        res.json(lead);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
