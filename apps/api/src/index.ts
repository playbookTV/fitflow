// Initialize Sentry before any other imports so auto-instrumentation can wrap them.
import "./instrument";
// Validate required env vars at startup (throws if any are missing)
import { env } from "./lib/env";
import express, { Express, Request, Response, NextFunction } from "express";
import { Sentry } from "./lib/sentry";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import openApiSpec from "../openapi.json";
import clientsRouter from "./routes/clients";
import exercisesRouter from "./routes/exercises";
import plansRouter from "./routes/plans";
import assignmentsRouter from "./routes/assignments";
import webhooksRouter from "./routes/webhooks";
import paymentsRouter from "./routes/payments";
import paymentWebhookRouter from "./routes/payment-webhook";
import analyticsRouter from "./routes/analytics";
import intakeRouter from "./routes/intake";
import messagesRouter from "./routes/messages";
import flowsRouter from "./routes/flows";
import coachesRouter from "./routes/coaches";
import telegramWebhookRouter from "./routes/telegram-webhook";
import offersRouter from "./routes/offers";
import leadsRouter from "./routes/leads";
import publicRouter from "./routes/public";
import coachExercisesRouter from "./routes/coach-exercises";
import metaTemplatesRouter from "./routes/meta-templates";
import nutritionRouter from "./routes/nutrition";
import mealsRouter from "./routes/meals";
import mealPlansRouter from "./routes/meal-plans";
import mealAssignmentsRouter from "./routes/meal-assignments";
import shortLinksRouter from "./routes/short-links";
import subscriptionsRouter from "./routes/subscriptions";
import subscriptionWebhookRouter from "./routes/subscription-webhook";
import adminRouter from "./routes/admin";
import { prisma } from "./lib/prisma";
import posthog from "./lib/posthog";
import { startDailyScheduler } from "./jobs/daily-scheduler";
import { startWeeklyCheckinScheduler } from "./jobs/weekly-checkin";
import { startRenewalScheduler } from "./jobs/renewal-scheduler";
import { startEngagementScheduler } from "./jobs/engagement-scheduler";
import { startWeeklySummaryScheduler } from "./jobs/weekly-summary-scheduler";
import { startMissedCheckinScheduler } from "./jobs/missed-checkin-scheduler";
import { startYMoveUsageScheduler } from "./jobs/ymove-usage-scheduler";
import { startDailyMealScheduler } from "./jobs/daily-meal-scheduler";
import { startRiskScoringScheduler } from "./jobs/risk-scoring-scheduler";
import { schedulersEnabled, workersEnabled } from "./lib/background-jobs";
import { ensureSharedBot } from "./lib/bot-provisioner";

if (workersEnabled()) {
    require("./workers/workoutProcessor");
    require("./workers/engagementWorker");
    require("./workers/mealProcessor");
    require("./workers/riskScoringWorker");
    console.log("[Startup] Background workers enabled (workout + engagement + meal + risk-scoring)");
} else {
    console.log("[Startup] Background workers disabled");
}

if (schedulersEnabled()) {
    startDailyScheduler();
    startWeeklyCheckinScheduler();
    startRenewalScheduler();
    startEngagementScheduler();
    startWeeklySummaryScheduler();
    startMissedCheckinScheduler();
    startYMoveUsageScheduler();
    startDailyMealScheduler();
    startRiskScoringScheduler();
    console.log("[Startup] Schedulers enabled (9 active)");
} else {
    console.log("[Startup] Schedulers disabled");
}

const app: Express = express();
const PORT = env.PORT;

// Trust first proxy (Railway/Render/etc.) so X-Forwarded-For is used for client IP
app.set("trust proxy", 1);

// Middleware
// Explicit CSP — the API mostly returns JSON, but the bank-transfer receipt
// endpoint serves HTML with an inline <style> block, so we allow inline styles
// and forbid scripts/objects/frames outright.
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
        },
    },
}));
const allowedOrigins = Array.from(new Set([
    env.WEB_URL,
    ...(env.PREVIEW_URL ? [env.PREVIEW_URL] : []),
    ...(env.ALLOWED_ORIGINS
        ? env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
        : []),
]));
console.log(`[cors] allowed origins: ${allowedOrigins.join(", ")}`);
// Public routes (/p/*) allow any origin — they power external landing pages
app.use("/p", cors());
app.use(cors({
    origin: allowedOrigins,
    credentials: true,
}));
// IMPORTANT: payment-webhook and subscription-webhook routes MUST be mounted
// BEFORE express.json() because they use express.raw() for Stripe signature
// verification. The verify callback below stores rawBody for Meta webhook
// signature verification in webhooks.ts.
app.use("/payments", paymentWebhookRouter);
app.use("/subscriptions", subscriptionWebhookRouter);
app.use(express.json({
    verify: (req: any, _res, buf) => {
        req.rawBody = buf;
    },
}));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const generalLimiter = rateLimit({ windowMs: 60_000, max: 100, standardHeaders: true, legacyHeaders: false });
const strictLimiter = rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false });
const webhookLimiter = rateLimit({ windowMs: 60_000, max: 200, standardHeaders: true, legacyHeaders: false });

app.use(generalLimiter);
app.use("/intake", strictLimiter);
app.use("/p", strictLimiter);
app.use("/webhooks", webhookLimiter);
app.use("/telegram/webhook", webhookLimiter);

// API Documentation (Swagger UI)
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec, {
    customSiteTitle: "FitFlow API Documentation",
    customCss: ".swagger-ui .topbar { display: none }",
}));

// Health check
app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/clients", clientsRouter);
app.use("/clients", assignmentsRouter);
app.use("/exercises", exercisesRouter);
app.use("/plans", plansRouter);
app.use("/webhooks", webhooksRouter);
app.use("/payments", paymentsRouter);
app.use("/analytics", analyticsRouter);
app.use("/intake", intakeRouter);
app.use("/messages", messagesRouter);
app.use("/flows", flowsRouter);
app.use("/coaches", coachesRouter);
app.use("/telegram/webhook", telegramWebhookRouter);
app.use("/offers", offersRouter);
app.use("/leads", leadsRouter);
app.use("/p", publicRouter);
app.use("/coach-exercises", coachExercisesRouter);
app.use("/meta-templates", metaTemplatesRouter);
app.use("/nutrition", nutritionRouter);
app.use("/meals", mealsRouter);
app.use("/meal-plans", mealPlansRouter);
app.use("/clients", mealAssignmentsRouter);
app.use("/short-links", shortLinksRouter);
app.use("/subscriptions", subscriptionsRouter);
app.use("/admin", adminRouter);

// GET /go/:code — Short link resolve (returns JSON for web app redirect)
app.get("/go/:code", async (req: Request, res: Response) => {
    try {
        const link = await prisma.shortLink.findUnique({
            where: { code: req.params.code as string },
        });
        if (!link) return res.status(404).json({ error: "Link not found" });

        await prisma.shortLink.update({
            where: { id: link.id },
            data: { clicks: { increment: 1 } },
        });

        res.json({ targetUrl: link.targetUrl });
    } catch {
        res.status(500).json({ error: "Failed to resolve link" });
    }
});

// 404
app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Not found" });
});

// Sentry error handler (must come before any other error middleware)
Sentry.setupExpressErrorHandler(app);

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err.stack);
    posthog.captureException(err);
    res.status(500).json({ error: "Internal server error" });
});

if (process.env.NODE_ENV !== "test") {
    app.listen(PORT, async () => {
        console.log(`✅ FitFlow API running on http://localhost:${PORT}`);
        await ensureSharedBot();
    });

    process.on("SIGTERM", async () => {
        await posthog.shutdown();
    });
}

export default app;
