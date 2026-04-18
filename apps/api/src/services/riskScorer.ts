import { RiskLevel } from "@prisma/client";

interface CheckInData {
    weight: number | null;
    energy: number | null;
    sleep: string | null;
    createdAt: Date;
}

interface WorkoutLogData {
    status: string;
    createdAt: Date;
}

interface MessageData {
    direction: string;
    createdAt: Date;
}

interface PaymentData {
    status: string;
    createdAt: Date;
}

export interface ClientRiskData {
    checkIns: CheckInData[];
    workoutLogs: WorkoutLogData[];
    messages: MessageData[];
    payments: PaymentData[];
    scheduledDaysPerWeek: number; // from active assignment's scheduleDays.length
}

export interface RiskFactors {
    [key: string]: number;
    compliance: number;
    engagement: number;
    activity: number;
    behavioral: number;
    payment: number;
}

export interface RiskResult {
    score: number;
    level: RiskLevel;
    factors: RiskFactors;
}

const WEIGHTS = {
    compliance: 0.35,
    engagement: 0.25,
    activity: 0.20,
    behavioral: 0.15,
    payment: 0.05,
};

function daysSince(date: Date): number {
    return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function scoreToLevel(score: number): RiskLevel {
    if (score <= 25) return RiskLevel.LOW;
    if (score <= 50) return RiskLevel.MODERATE;
    if (score <= 75) return RiskLevel.HIGH;
    return RiskLevel.CRITICAL;
}

function computeComplianceScore(logs: WorkoutLogData[], scheduledDaysPerWeek: number): number {
    // Look at last 14 days of workout logs
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const recentLogs = logs.filter((l) => l.createdAt >= fourteenDaysAgo);

    if (recentLogs.length === 0 && scheduledDaysPerWeek > 0) return 85;
    if (recentLogs.length === 0) return 0; // No assignment, no risk from compliance

    const completed = recentLogs.filter((l) => l.status === "COMPLETED").length;
    const rate = completed / recentLogs.length;

    if (rate >= 0.9) return 0;
    if (rate >= 0.75) return 20;
    if (rate >= 0.5) return 45;
    if (rate >= 0.25) return 70;
    return 95;
}

function computeEngagementScore(messages: MessageData[]): number {
    const inbound = messages.filter((m) => m.direction === "INBOUND");

    if (inbound.length === 0) return 80;

    const lastInbound = inbound.reduce((latest, m) =>
        m.createdAt > latest.createdAt ? m : latest
    );
    const days = daysSince(lastInbound.createdAt);

    if (days <= 2) return 0;
    if (days <= 4) return 20;
    if (days <= 6) return 40;
    if (days <= 9) return 65;
    return 90;
}

function computeActivityScore(checkIns: CheckInData[]): number {
    if (checkIns.length === 0) return 75;

    const latest = checkIns.reduce((l, c) => c.createdAt > l.createdAt ? c : l);
    const days = daysSince(latest.createdAt);

    if (days <= 7) return 0;
    if (days <= 10) return 30;
    if (days <= 14) return 55;
    if (days <= 21) return 75;
    return 95;
}

function computeBehavioralScore(checkIns: CheckInData[], logs: WorkoutLogData[]): number {
    let score = 0;

    // Energy trend: compare first half vs second half of recent check-ins
    const energyValues = checkIns
        .filter((c) => c.energy != null)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((c) => c.energy!);

    if (energyValues.length >= 4) {
        const mid = Math.floor(energyValues.length / 2);
        const firstHalf = energyValues.slice(0, mid);
        const secondHalf = energyValues.slice(mid);
        const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        const decline = avgFirst - avgSecond;

        if (decline >= 1.5) score += 40;
        else if (decline >= 0.8) score += 25;
        else if (decline >= 0.3) score += 10;
    }

    // Workout modification rate
    const recentLogs = logs.slice(0, 10);
    if (recentLogs.length > 0) {
        const modified = recentLogs.filter((l) => l.status === "MODIFIED").length;
        const modRate = modified / recentLogs.length;
        if (modRate >= 0.5) score += 40;
        else if (modRate >= 0.3) score += 25;
        else if (modRate >= 0.15) score += 10;
    }

    return Math.min(100, score);
}

function computePaymentScore(payments: PaymentData[]): number {
    if (payments.length === 0) return 0;

    const latest = payments.reduce((l, p) => p.createdAt > l.createdAt ? p : l);
    if (latest.status === "FAILED") return 90;
    if (latest.status === "PENDING" && daysSince(latest.createdAt) > 7) return 60;
    return 0;
}

export function computeRiskScore(data: ClientRiskData): RiskResult {
    const factors: RiskFactors = {
        compliance: computeComplianceScore(data.workoutLogs, data.scheduledDaysPerWeek),
        engagement: computeEngagementScore(data.messages),
        activity: computeActivityScore(data.checkIns),
        behavioral: computeBehavioralScore(data.checkIns, data.workoutLogs),
        payment: computePaymentScore(data.payments),
    };

    const score = Math.round(
        factors.compliance * WEIGHTS.compliance +
        factors.engagement * WEIGHTS.engagement +
        factors.activity * WEIGHTS.activity +
        factors.behavioral * WEIGHTS.behavioral +
        factors.payment * WEIGHTS.payment
    );

    return {
        score: Math.max(0, Math.min(100, score)),
        level: scoreToLevel(score),
        factors,
    };
}
