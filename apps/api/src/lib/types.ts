export enum JobType {
    WORKOUT_DELIVERY = "WORKOUT_DELIVERY",
    CHECKIN_REMINDER = "CHECKIN_REMINDER",
    ONBOARDING_INTAKE = "ONBOARDING_INTAKE",
}

export interface WorkoutDeliveryJob {
    clientId: string;
    dayNumber: number;
    assignmentId: string;
}

export interface CheckinReminderJob {
    clientId: string;
    trainerId: string;
}

export interface OnboardingIntakeJob {
    clientId: string;
    trainerId: string;
}

export interface ProcessMessageJob {
    clientId: string;
    trainerId: string;
    body: string;
    messageSid: string;
}
