"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastData {
    id: string;
    variant: ToastVariant;
    title: string;
    description?: string;
    duration?: number;
}

interface ToastContextValue {
    toast: (options: Omit<ToastData, "id">) => void;
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
    const ctx = React.useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
    return ctx;
}

/* ------------------------------------------------------------------ */
/*  Variant config                                                     */
/* ------------------------------------------------------------------ */

const VARIANT_CLASS: Record<ToastVariant, string> = {
    success: "toast-success",
    error: "toast-error",
    warning: "toast-warning",
    info: "toast-info",
};

const VARIANT_ICON: Record<ToastVariant, React.ReactNode> = {
    success: <CheckCircle className="toast-icon" aria-hidden="true" />,
    error: <XCircle className="toast-icon" aria-hidden="true" />,
    warning: <AlertTriangle className="toast-icon" aria-hidden="true" />,
    info: <Info className="toast-icon" aria-hidden="true" />,
};

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = React.useState<ToastData[]>([]);

    const toast = React.useCallback((options: Omit<ToastData, "id">) => {
        setToasts((prev) => [
            ...prev,
            { ...options, id: crypto.randomUUID() },
        ]);
    }, []);

    const removeToast = React.useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ toast }}>
            <ToastPrimitive.Provider swipeDirection="right">
                {children}

                {toasts.map((t) => (
                    <ToastPrimitive.Root
                        key={t.id}
                        className={cn(VARIANT_CLASS[t.variant])}
                        duration={t.duration ?? 5000}
                        onOpenChange={(open) => {
                            if (!open) removeToast(t.id);
                        }}
                    >
                        {VARIANT_ICON[t.variant]}
                        <div className="toast-content">
                            <ToastPrimitive.Title className="toast-title">
                                {t.title}
                            </ToastPrimitive.Title>
                            {t.description && (
                                <ToastPrimitive.Description className="toast-message">
                                    {t.description}
                                </ToastPrimitive.Description>
                            )}
                        </div>
                        <ToastPrimitive.Close className="toast-dismiss" aria-label="Dismiss">
                            <X className="w-4 h-4" aria-hidden="true" />
                        </ToastPrimitive.Close>
                    </ToastPrimitive.Root>
                ))}

                <ToastPrimitive.Viewport className="toast-container" />
            </ToastPrimitive.Provider>
        </ToastContext.Provider>
    );
}
