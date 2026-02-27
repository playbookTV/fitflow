"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
    size?: "sm" | "md" | "lg";
    className?: string;
    showText?: boolean;
}

export function Logo({ size = "sm", showText = false, className }: LogoProps) {
    const sizeClasses = {
        sm: "logo-sm",
        md: "logo-md",
        lg: "logo-lg",
    };

    const textSizeClasses = {
        sm: "text-xs",
        md: "text-sm",
        lg: "text-base",
    };

    return (
        <div className={cn("flex items-center gap-2", className)}>
            <div className={cn(sizeClasses[size])}>
                F
            </div>
            {showText && (
                <span className={cn(
                    "font-mono font-bold tracking-[0.2em] text-text-secondary",
                    textSizeClasses[size]
                )}>
                    FITFLOW
                </span>
            )}
        </div>
    );
}
