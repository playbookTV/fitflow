import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router: Router = Router();

// GET /analytics/summary - High-level stats for the trainer dashboard
router.get("/summary", authenticate, async (req: AuthRequest, res: Response) => {
    const trainerId = req.user?.id as string;
    if (!trainerId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const [clientCount, activePlanCount, totalWorkouts] = await Promise.all([
            prisma.client.count({ where: { trainerId } }),
            prisma.planAssignment.count({
                where: {
                    isActive: true,
                    client: { trainerId }
                }
            }),
            prisma.checkIn.count({
                where: {
                    client: { trainerId }
                }
            })
        ]);

        // At-risk logic: Active clients with no check-ins in last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const atRiskClients = await prisma.client.findMany({
            where: {
                trainerId,
                status: "ACTIVE",
                NOT: {
                    checkIns: {
                        some: {
                            createdAt: { gte: sevenDaysAgo }
                        }
                    }
                }
            },
            select: { id: true, name: true, phone: true }
        });

        // Calculate aggregate compliance
        const assignments = await prisma.planAssignment.findMany({
            where: { isActive: true, client: { trainerId } },
            select: { compliance: true } as any
        }) as any[];

        const avgCompliance = assignments.length > 0
            ? Math.round(assignments.reduce((acc, curr) => acc + (curr.compliance || 0), 0) / assignments.length)
            : 0;

        res.json({
            totalClients: clientCount,
            activePlans: activePlanCount,
            totalWorkouts,
            averageCompliance: avgCompliance,
            revenue: assignments.length * 50,
            atRiskClients
        });
    } catch (error) {
        console.error("[GET /analytics/summary]", error);
        res.status(500).json({ error: "Failed to fetch analytics" });
    }
});

export default router;
