import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router: Router = Router();

// GET /clients - List all clients for the authenticated coach
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;

    if (!coachId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const clients = await prisma.client.findMany({
            where: { coachId },
            orderBy: { createdAt: "desc" },
        });
        res.json(clients);
    } catch (error) {
        console.error("[GET /clients]", error);
        res.status(500).json({ error: "Failed to fetch clients" });
    }
});

// POST /clients - Create a new client
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const { name, phone, email, goals, notes } = req.body;

    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const client = await prisma.client.create({
            data: {
                coachId,
                name,
                phone,
                email,
                goals,
                notes,
            },
        });
        res.status(201).json(client);
    } catch (error) {
        console.error("[POST /clients]", error);
        res.status(500).json({ error: "Failed to create client" });
    }
});

// GET /clients/:id - Get single client details
router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const { id } = req.params;

    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const client = await prisma.client.findFirst({
            where: { id: id as string, coachId },
            include: {
                assignments: {
                    include: { plan: true },
                    orderBy: { startDate: "desc" },
                },
                checkIns: {
                    orderBy: { createdAt: "desc" },
                    take: 20,
                },
                workoutLogs: {
                    orderBy: { createdAt: "desc" },
                    take: 20,
                },
                messages: {
                    orderBy: { createdAt: "desc" },
                    take: 10,
                }
            }
        });

        if (!client) return res.status(404).json({ error: "Client not found" });

        res.json(client);
    } catch (error) {
        console.error(`[GET /clients/${id}]`, error);
        res.status(500).json({ error: "Failed to fetch client" });
    }
});

// PATCH /clients/:id - Update client
router.patch("/:id", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const { id } = req.params;
    const data = req.body;

    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const client = await prisma.client.update({
            where: { id: id as string, coachId },
            data,
        });
        res.json(client);
    } catch (error) {
        console.error(`[PATCH /clients/${id}]`, error);
        res.status(500).json({ error: "Failed to update client" });
    }
});

export default router;
