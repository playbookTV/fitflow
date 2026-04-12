import "dotenv/config";
import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
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
import { startDailyScheduler } from "./jobs/daily-scheduler";
import { startWeeklyCheckinScheduler } from "./jobs/weekly-checkin";
import { startRenewalScheduler } from "./jobs/renewal-scheduler";
import { startEngagementScheduler } from "./jobs/engagement-scheduler";
import { startWeeklySummaryScheduler } from "./jobs/weekly-summary-scheduler";
import { startMissedCheckinScheduler } from "./jobs/missed-checkin-scheduler";
import { startYMoveUsageScheduler } from "./jobs/ymove-usage-scheduler";
import { schedulersEnabled, workersEnabled } from "./lib/background-jobs";
import { ensureSharedBot } from "./lib/bot-provisioner";

if (workersEnabled()) {
    require("./workers/workoutProcessor");
    require("./workers/engagementWorker");
    console.log("[Startup] Background workers enabled (workout + engagement)");
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
    console.log("[Startup] Schedulers enabled (7 active)");
} else {
    console.log("[Startup] Schedulers disabled");
}

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
    origin: [
        process.env.WEB_URL || "http://localhost:3000",
        /\.vercel\.app$/ // Allow all Vercel preview/production deployments
    ],
    credentials: true
}));
app.use("/payments", paymentWebhookRouter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// 404
app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Not found" });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, async () => {
    console.log(`✅ FitFlow API running on http://localhost:${PORT}`);
    await ensureSharedBot();
});

export default app;
