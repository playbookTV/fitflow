import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import QRCode from "qrcode";

const router: Router = Router();

const BASE_URL = () => process.env.WEB_URL || "http://localhost:3000";

// GET /short-links — list coach's short links
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const links = await prisma.shortLink.findMany({
            where: { coachId },
            orderBy: { createdAt: "desc" },
        });

        res.json(
            links.map((link) => ({
                ...link,
                shortUrl: `${BASE_URL()}/go/${link.code}`,
            }))
        );
    } catch (error) {
        console.error("[GET /short-links]", error);
        res.status(500).json({ error: "Failed to fetch short links" });
    }
});

// POST /short-links — create a short link
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const { code, targetUrl, label } = req.body;

    if (!coachId) return res.status(401).json({ error: "Unauthorized" });
    if (!code || !targetUrl) {
        return res.status(400).json({ error: "code and targetUrl are required" });
    }

    // Sanitize code: lowercase, alphanumeric + hyphens only
    const cleanCode = code.toLowerCase().replaceAll(/[^a-z0-9-]/g, "");
    if (cleanCode.length < 2) {
        return res.status(400).json({ error: "Code must be at least 2 characters" });
    }

    try {
        const link = await prisma.shortLink.create({
            data: {
                coachId,
                code: cleanCode,
                targetUrl,
                label: label || null,
            },
        });

        res.status(201).json({
            ...link,
            shortUrl: `${BASE_URL()}/go/${link.code}`,
        });
    } catch (error: any) {
        if (error?.code === "P2002") {
            return res.status(409).json({ error: "This short code is already taken" });
        }
        console.error("[POST /short-links]", error);
        res.status(500).json({ error: "Failed to create short link" });
    }
});

// DELETE /short-links/:id — delete a short link
router.delete("/:id", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const { id } = req.params;

    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const link = await prisma.shortLink.findFirst({
            where: { id: id as string, coachId },
        });
        if (!link) return res.status(404).json({ error: "Short link not found" });

        await prisma.shortLink.delete({ where: { id: link.id } });
        res.json({ success: true });
    } catch (error) {
        console.error(`[DELETE /short-links/${id}]`, error);
        res.status(500).json({ error: "Failed to delete short link" });
    }
});

// GET /short-links/:id/qr — generate QR code PNG
router.get("/:id/qr", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const { id } = req.params;
    const size = Math.min(Number(req.query.size) || 300, 1000);

    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const link = await prisma.shortLink.findFirst({
            where: { id: id as string, coachId },
        });
        if (!link) return res.status(404).json({ error: "Short link not found" });

        const shortUrl = `${BASE_URL()}/go/${link.code}`;
        const qrBuffer = await QRCode.toBuffer(shortUrl, {
            width: size,
            margin: 2,
            color: { dark: "#000000", light: "#ffffff" },
        });

        res.setHeader("Content-Type", "image/png");
        res.setHeader("Content-Disposition", `inline; filename="${link.code}-qr.png"`);
        res.send(qrBuffer);
    } catch (error) {
        console.error(`[GET /short-links/${id}/qr]`, error);
        res.status(500).json({ error: "Failed to generate QR code" });
    }
});

export default router;
