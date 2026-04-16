import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router: Router = Router();

// GET /analytics/summary - High-level stats for the coach dashboard
router.get("/summary", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const [clientCount, activePlanCount, totalWorkouts, whatsappClients, telegramClients, leadCount, revenueAgg] = await Promise.all([
            prisma.client.count({ where: { coachId } }),
            prisma.planAssignment.count({
                where: {
                    isActive: true,
                    client: { coachId }
                }
            }),
            prisma.checkIn.count({
                where: {
                    client: { coachId }
                }
            }),
            prisma.client.count({ where: { coachId, preferredChannel: "WHATSAPP" } }),
            prisma.client.count({ where: { coachId, preferredChannel: "TELEGRAM" } }),
            prisma.lead.count({ where: { coachId, status: "NEW" } }),
            // Real revenue: sum of SUCCEEDED payments for this coach's clients (in pence/cents)
            prisma.payment.aggregate({
                where: { status: "SUCCEEDED", client: { coachId } },
                _sum: { amount: true },
            }),
        ]);

        // At-risk logic: Active clients with no check-ins in last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // phone deliberately omitted — it is PII and not needed for the dashboard risk widget.
        const atRiskClients = await prisma.client.findMany({
            where: {
                coachId,
                status: "ACTIVE",
                NOT: {
                    checkIns: {
                        some: {
                            createdAt: { gte: sevenDaysAgo }
                        }
                    }
                }
            },
            select: { id: true, name: true }
        });

        // Calculate aggregate compliance
        const assignments = await prisma.planAssignment.findMany({
            where: { isActive: true, client: { coachId } },
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
            // Revenue is summed from actual SUCCEEDED Payment records (in pence/cents)
            revenue: revenueAgg._sum.amount ?? 0,
            atRiskClients,
            channels: {
                whatsapp: whatsappClients,
                telegram: telegramClients,
            },
            newLeads: leadCount,
        });
    } catch (error) {
        console.error("[GET /analytics/summary]", error);
        res.status(500).json({ error: "Failed to fetch analytics" });
    }
});

// GET /analytics/events - Recent event log for the coach
router.get("/events", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    const limit = Math.min(Number(req.query.limit) || 50, 200);

    try {
        const events = await prisma.eventLog.findMany({
            where: { coachId },
            orderBy: { createdAt: "desc" },
            take: limit,
        });

        // Resolve client names for events that have a clientId
        const clientIds = [...new Set(events.map((e) => e.clientId).filter(Boolean))] as string[];
        const clients = clientIds.length > 0
            ? await prisma.client.findMany({
                where: { id: { in: clientIds } },
                select: { id: true, name: true },
            })
            : [];
        const clientMap = new Map(clients.map((c) => [c.id, c.name]));

        res.json(events.map((e) => ({
            ...e,
            clientName: (e.clientId && clientMap.get(e.clientId)) || null,
        })));
    } catch (error) {
        console.error("[GET /analytics/events]", error);
        res.status(500).json({ error: "Failed to fetch events" });
    }
});

export default router;
