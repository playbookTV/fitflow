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
import { startDailyScheduler } from "./jobs/daily-scheduler";
import { startWeeklyCheckinScheduler } from "./jobs/weekly-checkin";
import { startRenewalScheduler } from "./jobs/renewal-scheduler";
import { schedulersEnabled, workersEnabled } from "./lib/background-jobs";

if (workersEnabled()) {
    require("./workers/workoutProcessor");
    console.log("[Startup] Background workers enabled");
} else {
    console.log("[Startup] Background workers disabled");
}

if (schedulersEnabled()) {
    startDailyScheduler();
    startWeeklyCheckinScheduler();
    startRenewalScheduler();
    console.log("[Startup] Schedulers enabled");
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

// 404
app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Not found" });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
    console.log(`✅ FitFlow API running on http://localhost:${PORT}`);
});

export default app;
