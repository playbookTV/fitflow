"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  FormField container                                                */
/* ------------------------------------------------------------------ */

function FormField({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("form-field", className)} {...props}>
            {children}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  FormLabel — wraps Radix Label, enforces htmlFor                    */
/* ------------------------------------------------------------------ */

interface FormLabelProps
    extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {
    /** Required — must match the id of the associated input */
    htmlFor: string;
}

const FormLabel = React.forwardRef<
    React.ElementRef<typeof LabelPrimitive.Root>,
    FormLabelProps
>(({ className, ...props }, ref) => (
    <LabelPrimitive.Root
        ref={ref}
        className={cn("label-mono", className)}
        {...props}
    />
));
FormLabel.displayName = "FormLabel";

/* ------------------------------------------------------------------ */
/*  Auto-complete map — sensible defaults by input type                */
/* ------------------------------------------------------------------ */

const AUTO_COMPLETE_MAP: Record<string, string> = {
    email: "email",
    tel: "tel",
    password: "current-password",
    url: "url",
};

/* ------------------------------------------------------------------ */
/*  FormInput                                                          */
/* ------------------------------------------------------------------ */

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    /** Required — the input must have a name for form submission */
    name: string;
}

const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
    ({ className, type = "text", autoComplete, ...props }, ref) => (
        <input
            ref={ref}
            type={type}
            autoComplete={autoComplete ?? AUTO_COMPLETE_MAP[type] ?? undefined}
            className={cn("input w-full", className)}
            {...props}
        />
    ),
);
FormInput.displayName = "FormInput";

/* ------------------------------------------------------------------ */
/*  FormTextarea                                                       */
/* ------------------------------------------------------------------ */

interface FormTextareaProps
    extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    /** Required — the textarea must have a name */
    name: string;
}

const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
    ({ className, ...props }, ref) => (
        <textarea
            ref={ref}
            className={cn("textarea w-full", className)}
            {...props}
        />
    ),
);
FormTextarea.displayName = "FormTextarea";

/* ------------------------------------------------------------------ */
/*  FormSelect                                                         */
/* ------------------------------------------------------------------ */

interface FormSelectProps
    extends React.SelectHTMLAttributes<HTMLSelectElement> {
    /** Required — the select must have a name */
    name: string;
}

const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
    ({ className, children, ...props }, ref) => (
        <select
            ref={ref}
            className={cn("select w-full", className)}
            {...props}
        >
            {children}
        </select>
    ),
);
FormSelect.displayName = "FormSelect";

export { FormField, FormLabel, FormInput, FormTextarea, FormSelect };
