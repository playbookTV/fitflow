import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
import { checkinQueue } from "../lib/queue";
import { getDelayUntilSunday8PM } from "../lib/time";
import { JobType } from "../lib/types";

const prisma = new PrismaClient();

/**
 * Weekly Check-in Scheduler: Runs every Sunday morning.
 * Enqueues a check-in reminder for 8 PM in the client's local time.
 * Skips if the client has already checked in this week.
 */
export const startWeeklyCheckinScheduler = () => {
    // Schedule for 08:00 every Sunday
    cron.schedule("0 8 * * 0", async () => {
        console.log("[WeeklyCheckin] Starting weekly check-in enqueuing...");

        try {
            const now = new Date();
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())); // Sunday 00:00

            const activeClients = await prisma.client.findMany({
                where: {
                    assignments: {
                        some: { isActive: true }
                    }
                }
            });

            for (const client of activeClients) {
                // Check if client already checked in this week (CheckIn record exists)
                const recentCheckin = await prisma.checkIn.findFirst({
                    where: {
                        clientId: client.id,
                        createdAt: {
                            gte: startOfWeek
                        }
                    }
                });

                if (!recentCheckin) {
                    const timezone = client.timezone || "UTC";
                    const delay = getDelayUntilSunday8PM(timezone);

                    console.log(`[WeeklyCheckin] Enqueuing reminder for ${client.name} with delay ${delay}ms`);

                    await checkinQueue.add(
                        JobType.CHECKIN_REMINDER,
                        {
                            clientId: client.id,
                            trainerId: client.trainerId
                        },
                        { delay }
                    );
                }
            }
            console.log("[WeeklyCheckin] Weekly enqueuing complete.");
        } catch (error) {
            console.error("[WeeklyCheckin] Error running weekly checkin scheduler:", error);
        }
    });
};
