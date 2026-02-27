"use client";

import { cn } from "@/lib/utils";

export type ClientStatus =
    | "ACTIVE"
    | "PENDING_PAYMENT"
    | "INTAKE_SENT"
    | "INTAKE_COMPLETE"
    | "PLAN_ASSIGNED"
    | "PAUSED"
    | "INACTIVE";

const statusConfig: Record<ClientStatus, { label: string; className: string }> = {
    ACTIVE: {
        label: "Active",
        className: "badge-green",
    },
    PENDING_PAYMENT: {
        label: "Pending",
        className: "badge-amber",
    },
    INTAKE_SENT: {
        label: "Intake Sent",
        className: "badge-blue",
    },
    INTAKE_COMPLETE: {
        label: "Intake Done",
        className: "badge-violet",
    },
    PLAN_ASSIGNED: {
        label: "Plan Assigned",
        className: "badge-cyan",
    },
    PAUSED: {
        label: "Paused",
        className: "badge-amber",
    },
    INACTIVE: {
        label: "Inactive",
        className: "text-text-faint bg-white/5 border-white/10",
    },
};

interface StatusBadgeProps {
    status: string;
    className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const config = statusConfig[status as ClientStatus] || statusConfig.INACTIVE;

    return (
        <span className={cn("badge", config.className, className)}>
            {config.label}
        </span>
    );
}
