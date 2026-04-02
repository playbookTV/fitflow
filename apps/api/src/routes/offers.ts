import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router: Router = Router();

// GET /offers - List all offers for the coach
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const offers = await prisma.offer.findMany({
            where: { coachId },
            include: { _count: { select: { leads: true } } },
            orderBy: { createdAt: "desc" },
        });
        res.json(offers);
    } catch (error) {
        console.error("[GET /offers]", error);
        res.status(500).json({ error: "Failed to fetch offers" });
    }
});

// POST /offers - Create a new offer
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    const { name, slug, channelParam, ctaType, paymentRoute, sourceTags } = req.body;

    if (!name || !slug) {
        return res.status(400).json({ error: "name and slug are required" });
    }

    try {
        const offer = await prisma.offer.create({
            data: {
                coachId,
                name,
                slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                channelParam: channelParam || null,
                ctaType: ctaType || null,
                paymentRoute: paymentRoute || null,
                sourceTags: sourceTags || [],
            },
        });
        res.status(201).json(offer);
    } catch (error: any) {
        if (error.code === "P2002") {
            return res.status(409).json({ error: "An offer with this slug already exists" });
        }
        console.error("[POST /offers]", error);
        res.status(500).json({ error: "Failed to create offer" });
    }
});

// GET /offers/:id - Get single offer
router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const id = req.params.id as string;
    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const offer = await prisma.offer.findFirst({
            where: { id, coachId },
            include: {
                leads: { orderBy: { createdAt: "desc" }, take: 50 },
                _count: { select: { leads: true } },
            },
        });

        if (!offer) return res.status(404).json({ error: "Offer not found" });
        res.json(offer);
    } catch (error) {
        console.error(`[GET /offers/${id}]`, error);
        res.status(500).json({ error: "Failed to fetch offer" });
    }
});

// PATCH /offers/:id - Update an offer
router.patch("/:id", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const id = req.params.id as string;
    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const offer = await prisma.offer.updateMany({
            where: { id, coachId },
            data: req.body,
        });

        if (offer.count === 0) return res.status(404).json({ error: "Offer not found" });
        res.json({ success: true });
    } catch (error) {
        console.error(`[PATCH /offers/${id}]`, error);
        res.status(500).json({ error: "Failed to update offer" });
    }
});

// DELETE /offers/:id - Delete an offer
router.delete("/:id", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const id = req.params.id as string;
    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const result = await prisma.offer.deleteMany({
            where: { id, coachId },
        });

        if (result.count === 0) return res.status(404).json({ error: "Offer not found" });
        res.json({ success: true });
    } catch (error) {
        console.error(`[DELETE /offers/${id}]`, error);
        res.status(500).json({ error: "Failed to delete offer" });
    }
});

export default router;
