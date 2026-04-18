export enum JobType {
    WORKOUT_DELIVERY = "WORKOUT_DELIVERY",
    CHECKIN_REMINDER = "CHECKIN_REMINDER",
    ONBOARDING_INTAKE = "ONBOARDING_INTAKE",
    RENEWAL_REMINDER = "RENEWAL_REMINDER",

    // New template-driven job types
    PAYMENT_CONFIRMED = "PAYMENT_CONFIRMED",
    MISSED_WORKOUT_FOLLOWUP = "MISSED_WORKOUT_FOLLOWUP",
    MISSED_CHECKIN_NUDGE = "MISSED_CHECKIN_NUDGE",
    ATRISK_DETECTION = "ATRISK_DETECTION",
    REENGAGEMENT = "REENGAGEMENT",
    MILESTONE_CHECK = "MILESTONE_CHECK",
    WEEK_SUMMARY = "WEEK_SUMMARY",
    RENEWAL_7DAY = "RENEWAL_7DAY",
    RENEWAL_2DAY = "RENEWAL_2DAY",
    RENEWAL_POST_EXPIRY = "RENEWAL_POST_EXPIRY",

    // Meal planning
    MEAL_DELIVERY = "MEAL_DELIVERY",

    // AI risk scoring
    RISK_SCORE_COMPUTE = "RISK_SCORE_COMPUTE",
}

export interface MealDeliveryJob {
    clientId: string;
    assignmentId: string;
    dayNumber: number;
}

export interface WorkoutDeliveryJob {
    clientId: string;
    dayNumber: number;
    assignmentId: string;
}

export interface CheckinReminderJob {
    clientId: string;
    coachId: string;
}

export interface OnboardingIntakeJob {
    clientId: string;
    coachId: string;
}

export interface ProcessMessageJob {
    clientId: string;
    coachId: string;
    body: string;
    messageSid: string;
}

export interface PaymentConfirmedJob {
    clientId: string;
    coachId: string;
    offerName?: string;
    programmeStartDate?: string;
}

export interface MissedWorkoutFollowupJob {
    clientId: string;
    coachId: string;
}

export interface MissedCheckinNudgeJob {
    clientId: string;
    coachId: string;
    programmeWeek: number;
    checkinLink: string;
}

export interface AtRiskDetectionJob {
    clientId: string;
    coachId: string;
}

export interface ReengagementJob {
    clientId: string;
    coachId: string;
}

export interface MilestoneCheckJob {
    clientId: string;
    coachId: string;
    assignmentId: string;
    milestoneType: "halfway" | "completion";
    programmeWeek: number;
    totalWeeks: number;
    offerName: string;
}

export interface RiskScoreComputeJob {
    clientId: string;
    coachId: string;
}

export interface WeekSummaryJob {
    clientId: string;
    coachId: string;
    programmeWeek: number;
    totalWeeks: number;
    sessionsCompleted: number;
    sessionsSkipped: number;
    sessionsScheduled: number;
    consistencyRate: number;
}
