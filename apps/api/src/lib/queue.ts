import { Queue } from "bullmq";
import { redis } from "./redis";

export const connection = redis;

export const workoutQueue = new Queue("workout-delivery", { connection });
export const checkinQueue = new Queue("checkin-reminders", { connection });
export const onboardingQueue = new Queue("onboarding-intake", { connection });
export const renewalQueue = new Queue("renewal-reminders", { connection });
export const engagementQueue = new Queue("engagement", { connection });
