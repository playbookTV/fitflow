"use client";

import { cn } from "@/lib/utils";

interface SpinnerProps {
    size?: "sm" | "md" | "lg";
    className?: string;
}

export function Spinner({ size = "md", className }: SpinnerProps) {
    const sizeClasses = {
        sm: "spinner-sm",
        md: "spinner-md",
        lg: "spinner-lg",
    };

    return (
        <div
            className={cn(sizeClasses[size], className)}
            role="status"
            aria-label="Loading"
        />
    );
}
