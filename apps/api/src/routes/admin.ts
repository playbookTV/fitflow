import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { requirePlatformAdmin } from "../middleware/admin";
import { prisma } from "../lib/prisma";
import { TIER_PRICING, BillingCurrency, SubscriptionTier } from "@fitflow/shared";

const router: Router = Router();

// All admin routes require authentication + platform admin check
router.use(authenticate, requirePlatformAdmin);

// GET /admin/overview — Platform KPIs
router.get("/overview", async (_req: AuthRequest, res: Response) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [
            totalCoaches,
            totalClients,
            newCoachesThisMonth,
            newClientsThisMonth,
            subscriptionsByTier,
            trialingCount,
            pastDueCount,
            revenueAgg,
            recentCoaches,
            recentEvents,
        ] = await Promise.all([
            prisma.coach.count(),
            prisma.client.count(),
            prisma.coach.count({ where: { createdAt: { gte: startOfMonth } } }),
            prisma.client.count({ where: { createdAt: { gte: startOfMonth } } }),
            prisma.subscription.groupBy({
                by: ["tier"],
                where: { status: { in: ["ACTIVE", "TRIALING"] } },
                _count: true,
            }),
            prisma.subscription.count({ where: { status: "TRIALING" } }),
            prisma.subscription.count({ where: { status: "PAST_DUE" } }),
            prisma.payment.aggregate({
                where: { status: "SUCCEEDED" },
                _sum: { amount: true },
            }),
            prisma.coach.findMany({
                orderBy: { createdAt: "desc" },
                take: 5,
                select: { id: true, name: true, email: true, createdAt: true },
            }),
            prisma.eventLog.findMany({
                orderBy: { createdAt: "desc" },
                take: 10,
            }),
        ]);

        // Calculate MRR from active subscriptions
        const activeSubscriptions = await prisma.subscription.findMany({
            where: { status: { in: ["ACTIVE", "TRIALING"] } },
            include: { coach: { select: { billingCurrency: true } } },
        });

        let mrr = 0;
        for (const sub of activeSubscriptions) {
            const currency = (sub.coach.billingCurrency || "usd") as BillingCurrency;
            const tierPricing = TIER_PRICING[currency]?.[sub.tier];
            if (tierPricing) {
                mrr += sub.billingInterval === "ANNUAL" ? tierPricing.annual : tierPricing.monthly;
            }
        }

        const tierBreakdown = Object.fromEntries(
            subscriptionsByTier.map((g) => [g.tier, g._count])
        );

        res.json({
            totalCoaches,
            totalClients,
            newCoachesThisMonth,
            newClientsThisMonth,
            activeSubscriptions: activeSubscriptions.length,
            tierBreakdown,
            trialing: trialingCount,
            pastDue: pastDueCount,
            mrr,
            totalRevenue: revenueAgg._sum.amount ?? 0,
            recentCoaches,
            recentEvents,
        });
    } catch (error) {
        console.error("[GET /admin/overview]", error);
        res.status(500).json({ error: "Failed to fetch overview" });
    }
});

// GET /admin/coaches — Paginated coach list
router.get("/coaches", async (req: AuthRequest, res: Response) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
        const skip = (page - 1) * limit;
        const search = (req.query.search as string) || "";
        const tier = req.query.tier as SubscriptionTier | undefined;
        const status = req.query.status as string | undefined;
        const ALLOWED_SORT = new Set(["createdAt", "name", "email", "businessName"]);
        const requestedSort = req.query.sort as string | undefined;
        const sort = requestedSort && ALLOWED_SORT.has(requestedSort) ? requestedSort : "createdAt";
        const order = (req.query.order as string) === "asc" ? "asc" : "desc";

        const where: any = {};

        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { businessName: { contains: search, mode: "insensitive" } },
            ];
        }

        if (tier) {
            where.subscription = { tier };
        }

        if (status) {
            where.subscription = { ...where.subscription, status };
        }

        const [coaches, total] = await Promise.all([
            prisma.coach.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sort]: order },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    slug: true,
                    businessName: true,
                    billingCurrency: true,
                    onboardingCompleted: true,
                    createdAt: true,
                    subscription: {
                        select: {
                            tier: true,
                            status: true,
                            billingInterval: true,
                            trialEnd: true,
                        },
                    },
                    _count: {
                        select: { clients: true },
                    },
                },
            }),
            prisma.coach.count({ where }),
        ]);

        // Fetch revenue per coach (sum of succeeded payments for each coach's clients)
        const coachIds = coaches.map((c) => c.id);
        const revenueByCoach = await prisma.payment.groupBy({
            by: ["clientId"],
            where: {
                status: "SUCCEEDED",
                client: { coachId: { in: coachIds } },
            },
            _sum: { amount: true },
        });

        // Map clientId back to coachId via a lookup
        const clientToCoach = await prisma.client.findMany({
            where: { coachId: { in: coachIds } },
            select: { id: true, coachId: true },
        });
        const clientCoachMap = new Map(clientToCoach.map((c) => [c.id, c.coachId]));

        const revenueMap = new Map<string, number>();
        for (const r of revenueByCoach) {
            const coachId = clientCoachMap.get(r.clientId);
            if (coachId) {
                revenueMap.set(coachId, (revenueMap.get(coachId) || 0) + (r._sum.amount || 0));
            }
        }

        res.json({
            coaches: coaches.map((c) => ({
                ...c,
                clientCount: c._count.clients,
                revenue: revenueMap.get(c.id) || 0,
                _count: undefined,
            })),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error("[GET /admin/coaches]", error);
        res.status(500).json({ error: "Failed to fetch coaches" });
    }
});

// GET /admin/coaches/:id — Single coach detail
router.get("/coaches/:id", async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;

        const coach = await prisma.coach.findUnique({
            where: { id },
            include: {
                subscription: true,
                _count: {
                    select: {
                        clients: true,
                        plans: true,
                        mealPlans: true,
                        offers: true,
                        leads: true,
                    },
                },
            },
        });

        if (!coach) {
            return res.status(404).json({ error: "Coach not found" });
        }

        const [revenueAgg, recentEvents] = await Promise.all([
            prisma.payment.aggregate({
                where: { status: "SUCCEEDED", client: { coachId: id } },
                _sum: { amount: true },
            }),
            prisma.eventLog.findMany({
                where: { coachId: id },
                orderBy: { createdAt: "desc" },
                take: 20,
            }),
        ]);

        res.json({
            ...coach,
            revenue: revenueAgg._sum?.amount ?? 0,
            recentEvents,
        });
    } catch (error) {
        console.error("[GET /admin/coaches/:id]", error);
        res.status(500).json({ error: "Failed to fetch coach" });
    }
});

// GET /admin/coaches/:id/clients — Coach's client list
router.get("/coaches/:id/clients", async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
        const skip = (page - 1) * limit;

        const [clients, total] = await Promise.all([
            prisma.client.findMany({
                where: { coachId: id },
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    status: true,
                    preferredChannel: true,
                    monthlyRate: true,
                    createdAt: true,
                },
            }),
            prisma.client.count({ where: { coachId: id } }),
        ]);

        res.json({
            clients,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error("[GET /admin/coaches/:id/clients]", error);
        res.status(500).json({ error: "Failed to fetch clients" });
    }
});

// GET /admin/revenue — Revenue breakdown
router.get("/revenue", async (_req: AuthRequest, res: Response) => {
    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

        // MRR by tier
        const activeSubscriptions = await prisma.subscription.findMany({
            where: { status: { in: ["ACTIVE", "TRIALING"] } },
            include: { coach: { select: { billingCurrency: true } } },
        });

        const mrrByTier: Record<string, number> = { STARTER: 0, PRO: 0, STUDIO: 0 };
        for (const sub of activeSubscriptions) {
            const currency = (sub.coach.billingCurrency || "usd") as BillingCurrency;
            const tierPricing = TIER_PRICING[currency]?.[sub.tier];
            if (tierPricing) {
                const amount = sub.billingInterval === "ANNUAL" ? tierPricing.annual : tierPricing.monthly;
                mrrByTier[sub.tier] += amount;
            }
        }

        // Monthly revenue buckets (last 12 months)
        const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        const payments = await prisma.payment.findMany({
            where: {
                status: "SUCCEEDED",
                createdAt: { gte: twelveMonthsAgo },
            },
            select: { amount: true, createdAt: true, paymentMethod: true },
        });

        const monthlyRevenue: { month: string; amount: number }[] = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
            const total = payments
                .filter((p) => p.createdAt >= d && p.createdAt < monthEnd)
                .reduce((sum, p) => sum + p.amount, 0);
            monthlyRevenue.push({ month: key, amount: total });
        }

        // Payment volume by method
        const [stripeVolume, bankTransferVolume] = await Promise.all([
            prisma.payment.aggregate({
                where: { status: "SUCCEEDED", paymentMethod: "STRIPE" },
                _sum: { amount: true },
                _count: true,
            }),
            prisma.payment.aggregate({
                where: { status: "SUCCEEDED", paymentMethod: "BANK_TRANSFER" },
                _sum: { amount: true },
                _count: true,
            }),
        ]);

        // Churn: canceled subscriptions in windows
        const [churn30, churn60, churn90] = await Promise.all([
            prisma.subscription.count({ where: { status: "CANCELED", updatedAt: { gte: thirtyDaysAgo } } }),
            prisma.subscription.count({ where: { status: "CANCELED", updatedAt: { gte: sixtyDaysAgo } } }),
            prisma.subscription.count({ where: { status: "CANCELED", updatedAt: { gte: ninetyDaysAgo } } }),
        ]);

        // Recent subscription changes
        const recentChanges = await prisma.eventLog.findMany({
            where: {
                eventType: {
                    in: [
                        "subscription.created",
                        "subscription.upgraded",
                        "subscription.downgraded",
                        "subscription.canceled",
                    ],
                },
            },
            orderBy: { createdAt: "desc" },
            take: 20,
        });

        // Resolve coach names for subscription events
        const coachIds = [...new Set(recentChanges.map((e) => e.coachId).filter(Boolean))] as string[];
        const coachNames = coachIds.length > 0
            ? await prisma.coach.findMany({
                where: { id: { in: coachIds } },
                select: { id: true, name: true, email: true },
            })
            : [];
        const coachMap = new Map(coachNames.map((c) => [c.id, c.name || c.email]));

        res.json({
            mrr: Object.values(mrrByTier).reduce((a, b) => a + b, 0),
            mrrByTier,
            monthlyRevenue,
            paymentVolume: {
                stripe: { total: stripeVolume._sum?.amount ?? 0, count: stripeVolume._count },
                bankTransfer: { total: bankTransferVolume._sum?.amount ?? 0, count: bankTransferVolume._count },
            },
            churn: { last30Days: churn30, last60Days: churn60, last90Days: churn90 },
            recentChanges: recentChanges.map((e) => ({
                ...e,
                coachName: e.coachId ? coachMap.get(e.coachId) || null : null,
            })),
        });
    } catch (error) {
        console.error("[GET /admin/revenue]", error);
        res.status(500).json({ error: "Failed to fetch revenue data" });
    }
});

// GET /admin/events — Global event log with filters
router.get("/events", async (req: AuthRequest, res: Response) => {
    try {
        const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
        const page = Math.max(1, Number(req.query.page) || 1);
        const skip = (page - 1) * limit;
        const eventType = req.query.eventType as string | undefined;
        const coachId = req.query.coachId as string | undefined;
        const after = req.query.after ? new Date(req.query.after as string) : undefined;
        const before = req.query.before ? new Date(req.query.before as string) : undefined;

        const where: any = {};
        if (eventType) where.eventType = eventType;
        if (coachId) where.coachId = coachId;
        if (after || before) {
            where.createdAt = {};
            if (after) where.createdAt.gte = after;
            if (before) where.createdAt.lte = before;
        }

        const [events, total] = await Promise.all([
            prisma.eventLog.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.eventLog.count({ where }),
        ]);

        // Resolve coach and client names
        const coachIds = [...new Set(events.map((e) => e.coachId).filter(Boolean))] as string[];
        const clientIds = [...new Set(events.map((e) => e.clientId).filter(Boolean))] as string[];

        const [coaches, clients] = await Promise.all([
            coachIds.length > 0
                ? prisma.coach.findMany({ where: { id: { in: coachIds } }, select: { id: true, name: true, email: true } })
                : [],
            clientIds.length > 0
                ? prisma.client.findMany({ where: { id: { in: clientIds } }, select: { id: true, name: true } })
                : [],
        ]);

        const coachMap = new Map(coaches.map((c) => [c.id, c.name || c.email]));
        const clientMap = new Map(clients.map((c) => [c.id, c.name]));

        res.json({
            events: events.map((e) => ({
                ...e,
                coachName: e.coachId ? coachMap.get(e.coachId) || null : null,
                clientName: e.clientId ? clientMap.get(e.clientId) || null : null,
            })),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error("[GET /admin/events]", error);
        res.status(500).json({ error: "Failed to fetch events" });
    }
});

export default router;
