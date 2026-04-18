import { Queue } from "bullmq";
import { redis } from "./redis";

export const connection = redis;

export const workoutQueue = new Queue("workout-delivery", { connection });
export const checkinQueue = new Queue("checkin-reminders", { connection });
export const onboardingQueue = new Queue("onboarding-intake", { connection });
export const renewalQueue = new Queue("renewal-reminders", { connection });
export const engagementQueue = new Queue("engagement", { connection });
// Dedicated queue for inbound message processing (e.g. "DONE" keyword handling).
// Previously shared "workout-delivery" which caused BullMQ to dispatch jobs to the wrong worker.
export const messageQueue = new Queue("message-processing", { connection });
export const mealQueue = new Queue("meal-delivery", { connection });
export const riskScoringQueue = new Queue("risk-scoring", { connection });
