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
    Filter,
    ArrowUpRight,
    DollarSign,
    Users,
    Calendar,
    Send,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

interface Payment {
    id: string;
    clientId: string;
    clientName: string;
    amount: number;
    currency: string;
    status: "succeeded" | "pending" | "failed" | "refunded";
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
        // API call would go here
        console.log("Sending reminder for payment:", paymentId);
    };

    return (
        <DashboardLayout
            title="Billing"
            subtitle="Track payments and revenue"
            actions={
                <div className="flex items-center gap-3">
                    <button className="btn-secondary">
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Export</span>
                    </button>
                    <button className="btn-primary">
                        <CreditCard className="w-4 h-4" />
                        <span className="hidden sm:inline">CREATE INVOICE</span>
                    </button>
                </div>
            }
        >
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
                        <div className="data-table-header grid-cols-[1fr_120px_120px_100px_80px]">
                            <span className="label-mono">Client</span>
                            <span className="label-mono">Amount</span>
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
                                    className="data-table-row grid-cols-[1fr_120px_120px_100px_80px] group"
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
