import { Router } from "express";
import { prisma } from "../lib/prisma";

const router: Router = Router();

// POST /intake - Public endpoint for clients to submit their onboarding form
router.post("/", async (req, res) => {
    const { clientId, goals, medicalNotes, equipment, experience } = req.body;

    if (!clientId) return res.status(400).json({ error: "Missing Client ID" });

    try {
        const client = await prisma.client.findUnique({
            where: { id: clientId }
        });

        if (!client) return res.status(404).json({ error: "Client not found" });

        // Update client data and transition status
        await prisma.client.update({
            where: { id: clientId },
            data: {
                goals: goals,
                notes: `Medical: ${medicalNotes} \nEquipment: ${equipment} \nExperience: ${experience} `,
                status: "ACTIVE" // Transition from INTAKE_SENT to ACTIVE
            }
        });

        console.log(`[Intake] Client ${clientId} completed onboarding.`);
        res.json({ success: true, message: "Onboarding complete! Your trainer will be in touch soon." });
    } catch (error) {
        console.error("[Intake Error]", error);
        res.status(500).json({ error: "Failed to save intake data" });
    }
});

// GET /intake/:id - Get client name/meta for the onboarding page
router.get("/:id", async (req, res) => {
    try {
        const client = await prisma.client.findUnique({
            where: { id: req.params.id },
            select: { name: true, status: true }
        });

        if (!client) return res.status(404).json({ error: "Client not found" });
        res.json(client);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
