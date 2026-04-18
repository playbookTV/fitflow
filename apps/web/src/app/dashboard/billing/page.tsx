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
    });
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [showBankTransfer, setShowBankTransfer] = useState(false);
    const [bankTransferForm, setBankTransferForm] = useState({ clientId: "", amount: "" });
    const [confirmingTransfer, setConfirmingTransfer] = useState(false);
    const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
    const [stripeConnected, setStripeConnected] = useState(false);
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
                        totalRevenue: paymentHistory
                            .filter((payment) => payment.status === "succeeded")
                            .reduce((sum, payment) => sum + payment.amount, 0),
                        monthlyRevenue: currentMonthRevenue,
                        previousMonthRevenue,
                        pendingPayments: paymentHistory.filter((payment) => payment.status === "pending").length,
                        activeSubscriptions: new Set(
                            paymentHistory
                                .filter((payment) => payment.status === "succeeded")
                                .map((payment) => payment.clientId)
                        ).size,
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

    const filteredPayments = statusFilter
        ? payments.filter((p) => p.status === statusFilter)
        : payments;

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
                const { receiptUrl } = await res.json();
                window.open(receiptUrl, "_blank");
            }
        } catch (error) {
            console.error("Failed to fetch receipt:", error);
        }
    };

    const handleConfirmBankTransfer = async () => {
        if (!bankTransferForm.clientId || !bankTransferForm.amount) return;
        setConfirmingTransfer(true);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/payments/confirm-bank-transfer`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(await getAuthHeaders()),
                    },
                    body: JSON.stringify({
                        clientId: bankTransferForm.clientId,
                        amount: Math.round(parseFloat(bankTransferForm.amount) * 100),
                    }),
                }
            );
            if (res.ok) {
                setShowBankTransfer(false);
                setBankTransferForm({ clientId: "", amount: "" });
                // Refresh payment list
                window.location.reload();
            }
        } catch (error) {
            console.error("Failed to confirm bank transfer:", error);
        } finally {
            setConfirmingTransfer(false);
        }
    };

    return (
        <DashboardLayout
            title="Billing"
            subtitle="Track payments and revenue"
            actions={
                <div className="flex items-center gap-3">
                    <button className="btn-secondary" onClick={() => setShowBankTransfer(true)}>
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
            {/* Bank Transfer Confirmation Form */}
            {showBankTransfer && (
                <div className="card p-6 mb-8 animate-fade-in">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 text-balance">
                        <Landmark className="w-5 h-5 text-brand-violet" />
                        Confirm Bank Transfer
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div className="form-field">
                            <label htmlFor="billing-bank-client" className="label">Client</label>
                            <select
                                id="billing-bank-client"
                                name="clientId"
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
                            <label htmlFor="billing-bank-amount" className="label">Amount (GBP)</label>
                            <input
                                id="billing-bank-amount"
                                type="number"
                                name="amount"
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
                            onClick={handleConfirmBankTransfer}
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
                            {statusFilter ? "Try a different filter" : "No payment history yet"}
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

                                    <div className="flex justify-end">
                                        {payment.status === "pending" && (
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
                                        {payment.status === "succeeded" && payment.paymentMethod !== "BANK_TRANSFER" && (
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
