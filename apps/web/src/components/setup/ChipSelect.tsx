"use client";

import { cn } from "@/lib/utils";

interface ChipOption {
    value: string;
    label: string;
    description?: string;
    icon?: React.ReactNode;
}

interface ChipSelectProps {
    options: ChipOption[];
    selected: string | string[];
    onChange: (value: string | string[]) => void;
    multi?: boolean;
    variant?: "chip" | "card";
}

export function ChipSelect({
    options,
    selected,
    onChange,
    multi = false,
    variant = "chip",
}: ChipSelectProps) {
    const isSelected = (value: string) =>
        multi
            ? (selected as string[]).includes(value)
            : selected === value;

    const handleClick = (value: string) => {
        if (multi) {
            const arr = selected as string[];
            onChange(
                arr.includes(value)
                    ? arr.filter((v) => v !== value)
                    : [...arr, value]
            );
        } else {
            onChange(selected === value ? "" : value);
        }
    };

    if (variant === "card") {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {options.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => handleClick(option.value)}
                        className={cn(
                            "p-4 rounded-xl border text-left transition-[color,background-color,border-color] duration-200",
                            isSelected(option.value)
                                ? "border-brand-green/40 bg-brand-green/10"
                                : "border-border bg-bg-hover hover:border-border-hover"
                        )}
                    >
                        <div className="flex items-start gap-3">
                            {option.icon && (
                                <div className={cn(
                                    "mt-0.5",
                                    isSelected(option.value)
                                        ? "text-brand-green"
                                        : "text-text-faint"
                                )}>
                                    {option.icon}
                                </div>
                            )}
                            <div>
                                <p className={cn(
                                    "text-sm font-medium",
                                    isSelected(option.value)
                                        ? "text-white"
                                        : "text-text-secondary"
                                )}>
                                    {option.label}
                                </p>
                                {option.description && (
                                    <p className="text-xs text-text-faint mt-1">
                                        {option.description}
                                    </p>
                                )}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-wrap gap-2">
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    onClick={() => handleClick(option.value)}
                    className={cn(
                        "px-3.5 py-1.5 rounded-full text-sm font-medium border transition-[color,background-color,border-color] duration-200",
                        isSelected(option.value)
                            ? "border-brand-green/40 bg-brand-green/10 text-brand-green"
                            : "border-border bg-bg-hover text-text-secondary hover:border-border-hover hover:text-white"
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}
