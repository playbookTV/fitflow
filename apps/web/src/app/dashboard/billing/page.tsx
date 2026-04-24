"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/DashboardLayout";
import { getAuthHeaders } from "@/lib/auth";
import {
    CreditCard,
    TrendingUp,
    Clock,
    CheckCircle2,
    XCircle,
    ExternalLink,
    Download,
    ArrowUpRight,
    DollarSign,
    Users,
    Send,
    Landmark,
    Loader2,
    ClipboardCopy,
    Check,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { formatCurrency } from "@/lib/tokens";

interface Payment {
    id: string;
    clientId: string;
    clientName: string;
    amount: number;
    currency: string;
    status: "succeeded" | "pending" | "failed" | "refunded";
    paymentMethod?: "STRIPE" | "BANK_TRANSFER";
    description?: string;
    createdAt: string;
}

interface BillingStats {
    totalRevenue: number;
    monthlyRevenue: number;
    previousMonthRevenue: number;
    pendingPayments: number;
    activeSubscriptions: number;
    stripeRevenue: number;
    bankRevenue: number;
}


const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    succeeded: { label: "Paid", className: "badge-green", icon: CheckCircle2 },
    pending: { label: "Pending", className: "badge-amber", icon: Clock },
    failed: { label: "Failed", className: "badge-red", icon: XCircle },
    refunded: { label: "Refunded", className: "badge-blue", icon: ArrowUpRight },
};

function formatPaymentCurrency(amount: number, currency: string = "GBP") {
    return formatCurrency(amount / 100, currency);
}

export default function BillingPage() {
    const [stats, setStats] = useState<BillingStats>({
        totalRevenue: 0,
        monthlyRevenue: 0,
        previousMonthRevenue: 0,
        pendingPayments: 0,
        activeSubscriptions: 0,
        stripeRevenue: 0,
        bankRevenue: 0,
    });
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [methodFilter, setMethodFilter] = useState<string | null>(null);
    const [showBankTransfer, setShowBankTransfer] = useState(false);
    const [bankTransferMode, setBankTransferMode] = useState<"send" | "confirm">("send");
    const [bankTransferForm, setBankTransferForm] = useState({ clientId: "", amount: "", bankDetails: "" });
    const [confirmingTransfer, setConfirmingTransfer] = useState(false);
    const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
    const [stripeConnected, setStripeConnected] = useState(false);
    const [coachBankDetails, setCoachBankDetails] = useState<string | null>(null);
    const [showCreateInvoice, setShowCreateInvoice] = useState(false);
    const [invoiceClientId, setInvoiceClientId] = useState("");
    const [invoiceLoading, setInvoiceLoading] = useState(false);
    const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
    const [linkCopied, setLinkCopied] = useState(false);
    const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
    const [reminderSentId, setReminderSentId] = useState<string | null>(null);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const headers = await getAuthHeaders();
                const [clientsRes, coachRes] = await Promise.all([
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/clients`, { headers }),
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/coaches/me`, { headers }),
                ]);
                if (clientsRes.ok) {
                    const data = await clientsRes.json();
                    setClients(data.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
                }
                if (coachRes.ok) {
                    const data = await coachRes.json();
                    setStripeConnected(data.stripeConnected);
                    if (data.bankDetails) {
                        setCoachBankDetails(data.bankDetails);
                    }
                }
            } catch {}
        };
        fetchInitialData();
    }, []);

    useEffect(() => {
        const fetchBillingData = async () => {
            try {
                const paymentsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/history`, {
                    headers: await getAuthHeaders(),
                });

                if (paymentsRes.ok) {
                    const paymentHistory: Payment[] = await paymentsRes.json();
                    setPayments(paymentHistory);

                    const now = new Date();
                    const succeededPayments = paymentHistory.filter((p) => p.status === "succeeded");

                    const currentMonthRevenue = paymentHistory
                        .filter((payment) => {
                            const createdAt = new Date(payment.createdAt);
                            return (
                                payment.status === "succeeded" &&
                                createdAt.getUTCFullYear() === now.getUTCFullYear() &&
                                createdAt.getUTCMonth() === now.getUTCMonth()
                            );
                        })
                        .reduce((sum, payment) => sum + payment.amount, 0);

                    const prevMonth = now.getUTCMonth() === 0 ? 11 : now.getUTCMonth() - 1;
                    const prevYear = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
                    const previousMonthRevenue = paymentHistory
                        .filter((payment) => {
                            const createdAt = new Date(payment.createdAt);
                            return (
                                payment.status === "succeeded" &&
                                createdAt.getUTCFullYear() === prevYear &&
                                createdAt.getUTCMonth() === prevMonth
                            );
                        })
                        .reduce((sum, payment) => sum + payment.amount, 0);

                    setStats({
                        totalRevenue: succeededPayments.reduce((sum, p) => sum + p.amount, 0),
                        monthlyRevenue: currentMonthRevenue,
                        previousMonthRevenue,
                        pendingPayments: paymentHistory.filter((payment) => payment.status === "pending").length,
                        activeSubscriptions: new Set(
                            succeededPayments.map((payment) => payment.clientId)
                        ).size,
                        stripeRevenue: succeededPayments
                            .filter((p) => p.paymentMethod !== "BANK_TRANSFER")
                            .reduce((sum, p) => sum + p.amount, 0),
                        bankRevenue: succeededPayments
                            .filter((p) => p.paymentMethod === "BANK_TRANSFER")
                            .reduce((sum, p) => sum + p.amount, 0),
                    });
                } else {
                    setPayments([]);
                }
            } catch {
                setPayments([]);
            } finally {
                setLoading(false);
            }
        };
        fetchBillingData();
    }, []);

    const filteredPayments = payments
        .filter((p) => !statusFilter || p.status === statusFilter)
        .filter((p) => !methodFilter || p.paymentMethod === methodFilter);

    // Pending bank transfer payments for the "Confirm Receipt" tab
    const pendingBankTransfers = payments.filter(
        (p) => p.status === "pending" && p.paymentMethod === "BANK_TRANSFER"
    );

    const handleSendReminder = async (paymentId: string) => {
        setSendingReminderId(paymentId);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/${paymentId}/remind`, {
                method: "POST",
                headers: await getAuthHeaders(),
            });
            if (res.ok) {
                setReminderSentId(paymentId);
                setTimeout(() => setReminderSentId(null), 3000);
            }
        } catch (error) {
            console.error("Failed to send reminder:", error);
        } finally {
            setSendingReminderId(null);
        }
    };

    const handleDownloadReceipt = async (paymentId: string) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/${paymentId}/receipt`, {
                headers: await getAuthHeaders(),
            });
            if (res.ok) {
                const contentType = res.headers.get("content-type") || "";
                if (contentType.includes("text/html")) {
                    const html = await res.text();
                    const blob = new Blob([html], { type: "text/html" });
                    window.open(URL.createObjectURL(blob), "_blank");
                } else {
                    const { receiptUrl } = await res.json();
                    window.open(receiptUrl, "_blank");
                }
            }
        } catch (error) {
            console.error("Failed to fetch receipt:", error);
        }
    };

    const handleSendBankDetails = async () => {
        if (!bankTransferForm.clientId || !bankTransferForm.amount || !bankTransferForm.bankDetails) return;
        setConfirmingTransfer(true);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/payments/send-bank-details`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(await getAuthHeaders()),
                    },
                    body: JSON.stringify({
                        clientId: bankTransferForm.clientId,
                        amount: Math.round(parseFloat(bankTransferForm.amount) * 100),
                        bankTransferDetails: bankTransferForm.bankDetails,
                    }),
                }
            );
            if (res.ok) {
                setShowBankTransfer(false);
                setBankTransferForm({ clientId: "", amount: "", bankDetails: coachBankDetails || "" });
                window.location.reload();
            }
        } catch (error) {
            console.error("Failed to send bank details:", error);
        } finally {
            setConfirmingTransfer(false);
        }
    };

    const handleConfirmBankTransfer = async (paymentId?: string, clientId?: string, amount?: number) => {
        const targetClientId = clientId || bankTransferForm.clientId;
        const targetAmount = amount || Math.round(parseFloat(bankTransferForm.amount) * 100);

        if (!targetClientId) return;
        if (!paymentId && !bankTransferForm.amount) return;

        setConfirmingTransfer(true);
        try {
            const body: Record<string, any> = { clientId: targetClientId };
            if (paymentId) {
                body.paymentId = paymentId;
            } else {
                body.amount = targetAmount;
            }

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/payments/confirm-bank-transfer`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(await getAuthHeaders()),
                    },
                    body: JSON.stringify(body),
                }
            );

            if (res.status === 409) {
                const data = await res.json();
                const proceed = window.confirm(
                    `${data.message}\n\nClick OK to confirm this payment anyway.`
                );
                if (proceed) {
                    const forceRes = await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL}/payments/confirm-bank-transfer`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                ...(await getAuthHeaders()),
                            },
                            body: JSON.stringify({ ...body, force: true }),
                        }
                    );
                    if (forceRes.ok) {
                        setShowBankTransfer(false);
                        setBankTransferForm({ clientId: "", amount: "", bankDetails: coachBankDetails || "" });
                        window.location.reload();
                    }
                }
                return;
            }

            if (res.ok) {
                setShowBankTransfer(false);
                setBankTransferForm({ clientId: "", amount: "", bankDetails: coachBankDetails || "" });
                window.location.reload();
            }
        } catch (error) {
            console.error("Failed to confirm bank transfer:", error);
        } finally {
            setConfirmingTransfer(false);
        }
    };

    const openBankTransferPanel = (mode: "send" | "confirm" = "send") => {
        setBankTransferMode(mode);
        setBankTransferForm({ clientId: "", amount: "", bankDetails: coachBankDetails || "" });
        setShowBankTransfer(true);
    };

    return (
        <DashboardLayout
            title="Billing"
            subtitle="Track payments and revenue"
            actions={
                <div className="flex items-center gap-3">
                    <button className="btn-secondary" onClick={() => openBankTransferPanel("send")}>
                        <Landmark className="w-4 h-4" />
                        <span className="hidden sm:inline">BANK TRANSFER</span>
                    </button>
                    <button className="btn-primary" onClick={() => { setGeneratedUrl(null); setInvoiceClientId(""); setShowCreateInvoice(true); }}>
                        <CreditCard className="w-4 h-4" />
                        <span className="hidden sm:inline">CREATE INVOICE</span>
                    </button>
                </div>
            }
        >
            {/* Bank Transfer Panel */}
            {showBankTransfer && (
                <div className="card p-6 mb-8 animate-fade-in">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 text-balance">
                        <Landmark className="w-5 h-5 text-brand-violet" />
                        Bank Transfer
                    </h3>

                    {/* Mode tabs */}
                    <div className="tabs mb-4">
                        <button
                            onClick={() => setBankTransferMode("send")}
                            className={cn("tab", bankTransferMode === "send" && "tab-active")}
                        >
                            Send Details
                        </button>
                        <button
                            onClick={() => setBankTransferMode("confirm")}
                            className={cn("tab", bankTransferMode === "confirm" && "tab-active")}
                        >
                            Confirm Receipt
                        </button>
                    </div>

                    {bankTransferMode === "send" ? (
                        /* Send Details mode */
                        <div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <div className="form-field">
                                    <label htmlFor="bank-send-client" className="label">Client</label>
                                    <select
                                        id="bank-send-client"
                                        value={bankTransferForm.clientId}
                                        onChange={(e) =>
                                            setBankTransferForm({ ...bankTransferForm, clientId: e.target.value })
                                        }
                                        className="select"
                                    >
                                        <option value="">Select a client...</option>
                                        {clients.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-field">
                                    <label htmlFor="bank-send-amount" className="label">Amount (GBP)</label>
                                    <input
                                        id="bank-send-amount"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={bankTransferForm.amount}
                                        onChange={(e) =>
                                            setBankTransferForm({ ...bankTransferForm, amount: e.target.value })
                                        }
                                        className="input"
                                        placeholder="50.00"
                                    />
                                </div>
                            </div>
                            <div className="form-field mb-4">
                                <label htmlFor="bank-send-details" className="label">Bank Details</label>
                                <textarea
                                    id="bank-send-details"
                                    value={bankTransferForm.bankDetails}
                                    onChange={(e) =>
                                        setBankTransferForm({ ...bankTransferForm, bankDetails: e.target.value })
                                    }
                                    className="input min-h-[80px]"
                                    placeholder={"Account: 12345678\nSort Code: 12-34-56\nReference: Your name"}
                                    rows={3}
                                />
                                {coachBankDetails && (
                                    <p className="text-xs text-text-faint mt-1">Pre-filled from your saved bank details</p>
                                )}
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button onClick={() => setShowBankTransfer(false)} className="btn-ghost">
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSendBankDetails}
                                    disabled={confirmingTransfer || !bankTransferForm.clientId || !bankTransferForm.amount || !bankTransferForm.bankDetails}
                                    className="btn-primary"
                                >
                                    {confirmingTransfer ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            Send to Client
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Confirm Receipt mode */
                        <div>
                            {pendingBankTransfers.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-sm text-text-secondary">No pending bank transfers to confirm.</p>
                                    <p className="text-xs text-text-faint mt-1">Send bank details to a client first, or confirm directly below.</p>
                                </div>
                            ) : (
                                <div className="space-y-3 mb-4">
                                    {pendingBankTransfers.map((p) => (
                                        <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-secondary">
                                            <div>
                                                <p className="text-sm font-medium text-white">{p.clientName}</p>
                                                <p className="text-xs text-text-faint">
                                                    {formatPaymentCurrency(p.amount, p.currency)} &middot; {formatDate(p.createdAt)}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleConfirmBankTransfer(p.id, p.clientId, p.amount)}
                                                disabled={confirmingTransfer}
                                                className="btn-primary !py-1.5 !px-3 !text-xs"
                                            >
                                                {confirmingTransfer ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <>
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        Confirm
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Direct confirm fallback */}
                            <div className="border-t border-border pt-4">
                                <p className="text-xs text-text-faint mb-3">Or confirm a transfer manually:</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                    <div className="form-field">
                                        <label htmlFor="bank-confirm-client" className="label">Client</label>
                                        <select
                                            id="bank-confirm-client"
                                            value={bankTransferForm.clientId}
                                            onChange={(e) =>
                                                setBankTransferForm({ ...bankTransferForm, clientId: e.target.value })
                                            }
                                            className="select"
                                        >
                                            <option value="">Select a client...</option>
                                            {clients.map((c) => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-field">
                                        <label htmlFor="bank-confirm-amount" className="label">Amount (GBP)</label>
                                        <input
                                            id="bank-confirm-amount"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={bankTransferForm.amount}
                                            onChange={(e) =>
                                                setBankTransferForm({ ...bankTransferForm, amount: e.target.value })
                                            }
                                            className="input"
                                            placeholder="50.00"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-3 justify-end">
                                    <button onClick={() => setShowBankTransfer(false)} className="btn-ghost">
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleConfirmBankTransfer()}
                                        disabled={confirmingTransfer || !bankTransferForm.clientId || !bankTransferForm.amount}
                                        className="btn-primary"
                                    >
                                        {confirmingTransfer ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Confirming...
                                            </>
                                        ) : (
                                            "Confirm Payment"
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Create Invoice Modal */}
            {showCreateInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateInvoice(false)} />
                    <div className="relative w-full max-w-lg card-elevated p-6 animate-scale-in">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 text-balance">
                            <CreditCard className="w-5 h-5 text-brand-green" />
                            Create Payment Link
                        </h3>
                        {generatedUrl ? (
                            <div className="space-y-4">
                                <p className="text-sm text-text-secondary text-pretty">
                                    Share this link with your client to collect payment:
                                </p>
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        value={generatedUrl}
                                        readOnly
                                        className="input flex-1 text-xs"
                                        aria-label="Payment link URL"
                                        name="paymentUrl"
                                    />
                                    <button
                                        className="btn-primary"
                                        onClick={() => {
                                            navigator.clipboard.writeText(generatedUrl);
                                            setLinkCopied(true);
                                            setTimeout(() => setLinkCopied(false), 2000);
                                        }}
                                    >
                                        {linkCopied ? (
                                            <><Check className="w-4 h-4" /> Copied</>
                                        ) : (
                                            <><ClipboardCopy className="w-4 h-4" /> Copy</>
                                        )}
                                    </button>
                                </div>
                                <div className="flex justify-end">
                                    <button onClick={() => setShowCreateInvoice(false)} className="btn-ghost">
                                        Close
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="form-field">
                                    <label htmlFor="billing-invoice-client" className="label">Client</label>
                                    <select
                                        id="billing-invoice-client"
                                        name="invoiceClientId"
                                        value={invoiceClientId}
                                        onChange={(e) => setInvoiceClientId(e.target.value)}
                                        className="select"
                                    >
                                        <option value="">Select a client...</option>
                                        {clients.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex gap-3 justify-end">
                                    <button onClick={() => setShowCreateInvoice(false)} className="btn-ghost">
                                        Cancel
                                    </button>
                                    <button
                                        disabled={invoiceLoading || !invoiceClientId}
                                        className="btn-primary"
                                        onClick={async () => {
                                            setInvoiceLoading(true);
                                            try {
                                                const res = await fetch(
                                                    `${process.env.NEXT_PUBLIC_API_URL}/payments/checkout`,
                                                    {
                                                        method: "POST",
                                                        headers: {
                                                            "Content-Type": "application/json",
                                                            ...(await getAuthHeaders()),
                                                        },
                                                        body: JSON.stringify({ clientId: invoiceClientId }),
                                                    }
                                                );
                                                if (res.ok) {
                                                    const { url } = await res.json();
                                                    setGeneratedUrl(url);
                                                }
                                            } catch (error) {
                                                console.error("Failed to create payment link:", error);
                                            } finally {
                                                setInvoiceLoading(false);
                                            }
                                        }}
                                    >
                                        {invoiceLoading ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                                        ) : (
                                            "Generate Payment Link"
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="stat-card">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-green/10 flex items-center justify-center">
                            <DollarSign className="w-4 h-4 text-brand-green" />
                        </div>
                        <span className="label-mono">Total Revenue</span>
                    </div>
                    <p className="text-2xl font-bold text-white tabular-nums">
                        {formatPaymentCurrency(stats.totalRevenue)}
                    </p>
                    <p className="text-xs text-text-faint mt-1">All time</p>
                    {(stats.stripeRevenue > 0 || stats.bankRevenue > 0) && (
                        <div className="flex gap-3 mt-2 text-xs text-text-faint">
                            <span className="flex items-center gap-1">
                                <CreditCard className="w-3 h-3" />
                                {formatPaymentCurrency(stats.stripeRevenue)}
                            </span>
                            <span className="flex items-center gap-1">
                                <Landmark className="w-3 h-3" />
                                {formatPaymentCurrency(stats.bankRevenue)}
                            </span>
                        </div>
                    )}
                </div>

                <div className="stat-card">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-brand-blue" />
                        </div>
                        <span className="label-mono">This Month</span>
                    </div>
                    <p className="text-2xl font-bold text-white tabular-nums">
                        {formatPaymentCurrency(stats.monthlyRevenue)}
                    </p>
                    {stats.previousMonthRevenue > 0 ? (
                        <p className={cn("text-xs mt-1", stats.monthlyRevenue >= stats.previousMonthRevenue ? "text-brand-green" : "text-brand-red")}>
                            {stats.monthlyRevenue >= stats.previousMonthRevenue ? "+" : ""}
                            {((stats.monthlyRevenue - stats.previousMonthRevenue) / stats.previousMonthRevenue * 100).toFixed(0)}% from last month
                        </p>
                    ) : stats.monthlyRevenue > 0 ? (
                        <p className="text-xs text-brand-green mt-1">New revenue</p>
                    ) : (
                        <p className="text-xs text-text-faint mt-1">No data yet</p>
                    )}
                </div>

                <div className="stat-card">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-orange/10 flex items-center justify-center">
                            <Clock className="w-4 h-4 text-brand-orange" />
                        </div>
                        <span className="label-mono">Pending</span>
                    </div>
                    <p className="text-2xl font-bold text-white tabular-nums">{stats.pendingPayments}</p>
                    <p className="text-xs text-text-faint mt-1">Awaiting payment</p>
                </div>

                <div className="stat-card">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-violet/10 flex items-center justify-center">
                            <Users className="w-4 h-4 text-brand-violet" />
                        </div>
                        <span className="label-mono">Active</span>
                    </div>
                    <p className="text-2xl font-bold text-white tabular-nums">{stats.activeSubscriptions}</p>
                    <p className="text-xs text-text-faint mt-1">Paying clients</p>
                </div>
            </div>

            {/* Payments Table */}
            <div className="mb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                    <h2 className="section-title text-balance">Recent Payments</h2>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="tabs">
                            {[
                                { value: null, label: "All" },
                                { value: "succeeded", label: "Paid" },
                                { value: "pending", label: "Pending" },
                                { value: "failed", label: "Failed" },
                            ].map((tab) => (
                                <button
                                    key={tab.value ?? "all"}
                                    onClick={() => setStatusFilter(tab.value)}
                                    className={cn(
                                        "tab",
                                        statusFilter === tab.value && "tab-active"
                                    )}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        <div className="tabs">
                            {[
                                { value: null, label: "All Methods" },
                                { value: "STRIPE", label: "Stripe" },
                                { value: "BANK_TRANSFER", label: "Bank" },
                            ].map((tab) => (
                                <button
                                    key={tab.value ?? "all-methods"}
                                    onClick={() => setMethodFilter(tab.value)}
                                    className={cn(
                                        "tab",
                                        methodFilter === tab.value && "tab-active"
                                    )}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="card overflow-hidden">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="skeleton h-[72px]" />
                        ))}
                    </div>
                ) : filteredPayments.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1 text-balance">No payments found</h3>
                        <p className="text-text-secondary text-sm text-pretty">
                            {statusFilter || methodFilter ? "Try a different filter" : "No payment history yet"}
                        </p>
                    </div>
                ) : (
                    <div className="card overflow-hidden">
                        {/* Header */}
                        <div className="data-table-header grid-cols-[1fr_100px_100px_100px_100px_80px]">
                            <span className="label-mono">Client</span>
                            <span className="label-mono">Amount</span>
                            <span className="label-mono">Method</span>
                            <span className="label-mono">Status</span>
                            <span className="label-mono">Date</span>
                            <span></span>
                        </div>

                        {/* Rows */}
                        {filteredPayments.map((payment) => {
                            const config = statusConfig[payment.status];
                            const StatusIcon = config.icon;

                            return (
                                <div
                                    key={payment.id}
                                    className="data-table-row grid-cols-[1fr_100px_100px_100px_100px_80px] group"
                                >
                                    <div className="flex flex-col gap-0.5">
                                        <Link
                                            href={`/dashboard/clients/${payment.clientId}`}
                                            className="text-sm font-medium text-white hover:text-brand-green transition-colors"
                                        >
                                            {payment.clientName}
                                        </Link>
                                        <span className="text-xs text-text-faint">
                                            {payment.description}
                                        </span>
                                    </div>

                                    <span className="text-sm font-mono text-white tabular-nums">
                                        {formatPaymentCurrency(payment.amount, payment.currency)}
                                    </span>

                                    <span className="text-[10px] font-bold text-text-faint uppercase tracking-wider">
                                        {payment.paymentMethod === "BANK_TRANSFER" ? "Bank" : "Stripe"}
                                    </span>

                                    <div className="flex">
                                        <span className={cn("badge flex items-center gap-1.5", config.className)}>
                                            <StatusIcon className="w-3 h-3" />
                                            {config.label}
                                        </span>
                                    </div>

                                    <span className="text-xs text-text-faint font-mono">
                                        {formatDate(payment.createdAt)}
                                    </span>

                                    <div className="flex justify-end gap-1">
                                        {payment.status === "pending" && payment.paymentMethod === "BANK_TRANSFER" && (
                                            <button
                                                onClick={() => handleConfirmBankTransfer(payment.id, payment.clientId, payment.amount)}
                                                disabled={confirmingTransfer}
                                                className="btn-icon !p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                aria-label="Confirm bank transfer"
                                                title="Confirm payment received"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5 text-brand-green" />
                                            </button>
                                        )}
                                        {payment.status === "pending" && payment.paymentMethod !== "BANK_TRANSFER" && (
                                            <button
                                                onClick={() => handleSendReminder(payment.id)}
                                                disabled={sendingReminderId === payment.id}
                                                className="btn-icon !p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                aria-label="Send reminder"
                                            >
                                                {sendingReminderId === payment.id ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : reminderSentId === payment.id ? (
                                                    <Check className="w-3.5 h-3.5 text-brand-green" />
                                                ) : (
                                                    <Send className="w-3.5 h-3.5" />
                                                )}
                                            </button>
                                        )}
                                        {payment.status === "succeeded" && (
                                            <button
                                                onClick={() => handleDownloadReceipt(payment.id)}
                                                className="btn-icon !p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                aria-label="Download receipt"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Stripe Connect Card */}
            <div className="card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-violet/10 border border-brand-violet/20 flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-brand-violet" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white mb-1 text-balance">Stripe Connect</h3>
                        <p className="text-sm text-text-secondary text-pretty">
                            {stripeConnected
                                ? "View your full payment dashboard and manage payouts"
                                : "Connect your Stripe account to receive client payments"}
                        </p>
                    </div>
                </div>
                {stripeConnected ? (
                    <button
                        className="btn-secondary"
                        onClick={async () => {
                            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/coaches/stripe/dashboard`, {
                                headers: await getAuthHeaders(),
                            });
                            if (res.ok) {
                                const { url } = await res.json();
                                window.open(url, "_blank");
                            }
                        }}
                    >
                        Open Dashboard
                        <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                ) : (
                    <Link href="/dashboard/settings?tab=integrations" className="btn-primary">
                        Connect Stripe
                        <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                )}
            </div>
        </DashboardLayout>
    );
}
