import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
    return new Intl.DateTimeFormat(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(new Date(date));
}

const RTF = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

export function formatRelative(date: Date | string): string {
    const d = new Date(date);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (days === 0) return RTF.format(0, "day"); // "today"
    if (days >= -1 && days < 0) return RTF.format(-1, "day"); // "yesterday"
    if (days > -7) return RTF.format(days, "day");
    if (days > -30) return RTF.format(Math.round(days / 7), "week");
    return formatDate(d);
}

/** Brand palette references for use in JS (e.g. Recharts) */
export const BRAND_COLORS = {
    green: "#25D366",
    orange: "#F0853A",
    red: "#EF5350",
    blue: "#4E97F8",
    violet: "#9D7CF4",
    cyan: "#26C6DA",
} as const;

export function complianceColor(pct: number): string {
    if (pct >= 80) return BRAND_COLORS.green;
    if (pct >= 50) return BRAND_COLORS.orange;
    return BRAND_COLORS.red;
}
