"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const modalContentVariants = cva("modal-content", {
    variants: {
        size: {
            sm: "max-w-sm",
            default: "max-w-lg",
            lg: "max-w-2xl",
            xl: "max-w-4xl",
        },
    },
    defaultVariants: {
        size: "default",
    },
});

/* ------------------------------------------------------------------ */
/*  Root                                                               */
/* ------------------------------------------------------------------ */

const Modal = Dialog.Root;
const ModalTrigger = Dialog.Trigger;

/* ------------------------------------------------------------------ */
/*  Content (overlay + panel)                                          */
/* ------------------------------------------------------------------ */

interface ModalContentProps
    extends React.ComponentPropsWithoutRef<typeof Dialog.Content>,
        VariantProps<typeof modalContentVariants> {}

const ModalContent = React.forwardRef<
    React.ElementRef<typeof Dialog.Content>,
    ModalContentProps
>(({ className, size, children, ...props }, ref) => (
    <Dialog.Portal>
        <Dialog.Overlay className="modal-backdrop" style={{ overscrollBehavior: "contain" }} />
        <Dialog.Content
            ref={ref}
            className={cn("modal", modalContentVariants({ size }), className)}
            style={{ overscrollBehavior: "contain" }}
            {...props}
        >
            {children}
        </Dialog.Content>
    </Dialog.Portal>
));
ModalContent.displayName = "ModalContent";

/* ------------------------------------------------------------------ */
/*  Header                                                             */
/* ------------------------------------------------------------------ */

function ModalHeader({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("modal-header", className)} {...props}>
            {children}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Title                                                              */
/* ------------------------------------------------------------------ */

const ModalTitle = React.forwardRef<
    React.ElementRef<typeof Dialog.Title>,
    React.ComponentPropsWithoutRef<typeof Dialog.Title>
>(({ className, ...props }, ref) => (
    <Dialog.Title ref={ref} className={cn("modal-title", className)} {...props} />
));
ModalTitle.displayName = "ModalTitle";

/* ------------------------------------------------------------------ */
/*  Footer                                                             */
/* ------------------------------------------------------------------ */

function ModalFooter({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("modal-footer", className)} {...props}>
            {children}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Close button (icon)                                                */
/* ------------------------------------------------------------------ */

const ModalClose = React.forwardRef<
    React.ElementRef<typeof Dialog.Close>,
    React.ComponentPropsWithoutRef<typeof Dialog.Close>
>(({ className, children, ...props }, ref) => (
    <Dialog.Close
        ref={ref}
        className={cn("btn-icon !p-1.5", className)}
        aria-label="Close"
        {...props}
    >
        {children ?? <X className="w-4 h-4" aria-hidden="true" />}
    </Dialog.Close>
));
ModalClose.displayName = "ModalClose";

export {
    Modal,
    ModalTrigger,
    ModalContent,
    ModalHeader,
    ModalTitle,
    ModalFooter,
    ModalClose,
};
