"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const iconButtonVariants = cva(
    "inline-flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-text-faint hover:text-white hover:bg-white/10 transition-colors cursor-pointer",
    {
        variants: {
            size: {
                sm: "p-1.5",
                default: "p-2.5",
                lg: "p-3",
            },
        },
        defaultVariants: {
            size: "default",
        },
    },
);

interface IconButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof iconButtonVariants> {
    /** Required — screen reader label for the icon button */
    "aria-label": string;
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
    ({ className, size, children, ...props }, ref) => (
        <button
            ref={ref}
            type="button"
            className={cn(iconButtonVariants({ size }), className)}
            {...props}
        >
            {React.Children.map(children, (child) =>
                React.isValidElement(child)
                    ? React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
                          "aria-hidden": "true",
                      })
                    : child,
            )}
        </button>
    ),
);
IconButton.displayName = "IconButton";

export { IconButton, iconButtonVariants };
