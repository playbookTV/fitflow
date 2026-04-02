import { Queue } from "bullmq";
import IORedis from "ioredis";

export const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
});

export const workoutQueue = new Queue("workout-delivery", { connection });
export const checkinQueue = new Queue("checkin-reminders", { connection });
export const onboardingQueue = new Queue("onboarding-intake", { connection });
export const renewalQueue = new Queue("renewal-reminders", { connection });
