"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/DashboardLayout";
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
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

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
    pendingPayments: number;
    activeSubscriptions: number;
}

// Mock data for development
const MOCK_STATS: BillingStats = {
    totalRevenue: 2450000,
    monthlyRevenue: 385000,
    pendingPayments: 3,
    activeSubscriptions: 12,
};

const MOCK_PAYMENTS: Payment[] = [
    { id: "p1", clientId: "c1", clientName: "Alex Rivera", amount: 35000, currency: "NGN", status: "succeeded", description: "Monthly coaching - March", createdAt: "2024-03-15T10:30:00Z" },
    { id: "p2", clientId: "c2", clientName: "Sarah Chen", amount: 35000, currency: "NGN", status: "pending", description: "Monthly coaching - March", createdAt: "2024-03-14T14:00:00Z" },
    { id: "p3", clientId: "c3", clientName: "Marcus Thorne", amount: 35000, currency: "NGN", status: "succeeded", description: "Monthly coaching - March", createdAt: "2024-03-12T09:15:00Z" },
    { id: "p4", clientId: "c4", clientName: "Elena Rodriguez", amount: 35000, currency: "NGN", status: "failed", description: "Monthly coaching - March", createdAt: "2024-03-10T16:45:00Z" },
    { id: "p5", clientId: "c5", clientName: "James Wilson", amount: 50000, currency: "NGN", status: "succeeded", description: "Premium coaching - March", createdAt: "2024-03-08T11:00:00Z" },
    { id: "p6", clientId: "c1", clientName: "Alex Rivera", amount: 35000, currency: "NGN", status: "succeeded", description: "Monthly coaching - February", createdAt: "2024-02-15T10:30:00Z" },
];

const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    succeeded: { label: "Paid", className: "badge-green", icon: CheckCircle2 },
    pending: { label: "Pending", className: "badge-amber", icon: Clock },
    failed: { label: "Failed", className: "badge-red", icon: XCircle },
    refunded: { label: "Refunded", className: "badge-blue", icon: ArrowUpRight },
};

function formatCurrency(amount: number, currency: string = "NGN") {
    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
    }).format(amount / 100);
}

export default function BillingPage() {
    const [stats, setStats] = useState<BillingStats>(MOCK_STATS);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [showBankTransfer, setShowBankTransfer] = useState(false);
    const [bankTransferForm, setBankTransferForm] = useState({ clientId: "", amount: "" });
    const [confirmingTransfer, setConfirmingTransfer] = useState(false);
    const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);

    useEffect(() => {
        // Fetch clients for the bank transfer dropdown
        const fetchClients = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/clients`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setClients(data.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
                }
            } catch {}
        };
        fetchClients();
    }, []);

    useEffect(() => {
        const fetchBillingData = async () => {
            try {
                const token = localStorage.getItem("token");
                const [statsRes, paymentsRes] = await Promise.all([
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/stats`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/payments`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                ]);

                if (statsRes.ok) setStats(await statsRes.json());
                if (paymentsRes.ok) setPayments(await paymentsRes.json());
                else setPayments(MOCK_PAYMENTS);
            } catch {
                setPayments(MOCK_PAYMENTS);
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
        console.log("Sending reminder for payment:", paymentId);
    };

    const handleConfirmBankTransfer = async () => {
        if (!bankTransferForm.clientId || !bankTransferForm.amount) return;
        setConfirmingTransfer(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/payments/confirm-bank-transfer`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
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
                    <button className="btn-primary">
                        <CreditCard className="w-4 h-4" />
                        <span className="hidden sm:inline">CREATE INVOICE</span>
                    </button>
                </div>
            }
        >
            {/* Bank Transfer Confirmation Form */}
            {showBankTransfer && (
                <div className="card p-6 mb-8 animate-fade-in">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Landmark className="w-5 h-5 text-brand-violet" />
                        Confirm Bank Transfer
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div className="form-field">
                            <label className="label">Client</label>
                            <select
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
                            <label className="label">Amount (GBP)</label>
                            <input
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

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="stat-card">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-green/10 flex items-center justify-center">
                            <DollarSign className="w-4 h-4 text-brand-green" />
                        </div>
                        <span className="label-mono">Total Revenue</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                        {formatCurrency(stats.totalRevenue)}
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
                    <p className="text-2xl font-bold text-white">
                        {formatCurrency(stats.monthlyRevenue)}
                    </p>
                    <p className="text-xs text-brand-green mt-1">+12% from last month</p>
                </div>

                <div className="stat-card">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-orange/10 flex items-center justify-center">
                            <Clock className="w-4 h-4 text-brand-orange" />
                        </div>
                        <span className="label-mono">Pending</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{stats.pendingPayments}</p>
                    <p className="text-xs text-text-faint mt-1">Awaiting payment</p>
                </div>

                <div className="stat-card">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-violet/10 flex items-center justify-center">
                            <Users className="w-4 h-4 text-brand-violet" />
                        </div>
                        <span className="label-mono">Active</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{stats.activeSubscriptions}</p>
                    <p className="text-xs text-text-faint mt-1">Paying clients</p>
                </div>
            </div>

            {/* Payments Table */}
            <div className="mb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                    <h2 className="section-title">Recent Payments</h2>
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
                        <h3 className="text-lg font-bold text-white mb-1">No payments found</h3>
                        <p className="text-text-secondary text-sm">
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

                                    <span className="text-sm font-mono text-white">
                                        {formatCurrency(payment.amount, payment.currency)}
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
                                                className="btn-icon !p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Send reminder"
                                            >
                                                <Send className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                        {payment.status === "succeeded" && (
                                            <button
                                                className="btn-icon !p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Download receipt"
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
                        <h3 className="font-semibold text-white mb-1">Stripe Connect</h3>
                        <p className="text-sm text-text-secondary">
                            View your full payment dashboard and manage payouts
                        </p>
                    </div>
                </div>
                <button className="btn-secondary">
                    Open Dashboard
                    <ExternalLink className="w-3.5 h-3.5" />
                </button>
            </div>
        </DashboardLayout>
    );
}
