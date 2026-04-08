import cron from "node-cron";
import { fetchUsage } from "../services/ymove";

/**
 * YMove Usage Monitor: Runs daily at 06:00.
 * Alerts when monthly video minutes usage reaches 80% of plan limit.
 */
export const startYMoveUsageScheduler = () => {
    cron.schedule("0 6 * * *", async () => {
        console.log("[YMoveUsage] Checking YMove API usage...");

        try {
            const { monthlyVideoMinutesUsed, monthlyVideoMinuteLimit } =
                await fetchUsage();
            const pct = monthlyVideoMinutesUsed / monthlyVideoMinuteLimit;

            console.log(
                `[YMoveUsage] ${monthlyVideoMinutesUsed}/${monthlyVideoMinuteLimit} minutes (${Math.round(pct * 100)}%)`
            );

            if (pct >= 0.8) {
                console.warn(
                    `[YMoveUsage] WARNING: Usage at ${Math.round(pct * 100)}% — consider upgrading YMove plan`
                );
                // Future: send Slack/email alert here
            }
        } catch (error) {
            console.error("[YMoveUsage] Failed to check usage:", error);
        }
    });

    console.log("[YMoveUsage] Scheduler registered (daily at 06:00)");
};
