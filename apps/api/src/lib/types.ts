export enum JobType {
    WORKOUT_DELIVERY = "WORKOUT_DELIVERY",
    CHECKIN_REMINDER = "CHECKIN_REMINDER",
    ONBOARDING_INTAKE = "ONBOARDING_INTAKE",
    RENEWAL_REMINDER = "RENEWAL_REMINDER",
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
