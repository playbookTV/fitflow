"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn, formatRelative, complianceColor } from "@/lib/utils";
import { Plus, Search, ArrowUpRight, MessageSquare, Send } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatusBadge } from "@/components/ui";
import { getAuthHeaders } from "@/lib/auth";

interface Client {
    id: string;
    name: string;
    phone: string | null;
    email?: string;
    status: string;
    preferredChannel?: "WHATSAPP" | "TELEGRAM";
    compliance?: number;
    lastCheckIn?: string;
    createdAt: string;
}

// Mock data for development
const MOCK_CLIENTS: Client[] = [
    { id: "1", name: "Alex Rivera", phone: "+44 7700 900123", status: "ACTIVE", compliance: 85, lastCheckIn: "2024-03-20", createdAt: "2024-01-15" },
    { id: "2", name: "Sarah Chen", phone: "+44 7700 900456", status: "PENDING_PAYMENT", compliance: 0, createdAt: "2024-03-01" },
    { id: "3", name: "Marcus Thorne", phone: "+44 7700 900789", status: "ACTIVE", compliance: 42, lastCheckIn: "2024-03-18", createdAt: "2024-02-10" },
    { id: "4", name: "Elena Rodriguez", phone: "+44 7700 900012", status: "INTAKE_SENT", compliance: 0, createdAt: "2024-03-15" },
    { id: "5", name: "James Wilson", phone: "+44 7700 900345", status: "ACTIVE", compliance: 92, lastCheckIn: "2024-03-21", createdAt: "2023-12-01" },
];

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string | null>(null);

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/clients`, {
                    headers: await getAuthHeaders(),
                });
                if (res.ok) {
                    setClients(await res.json());
                } else {
                    setClients(MOCK_CLIENTS);
                }
            } catch {
                setClients(MOCK_CLIENTS);
            } finally {
                setLoading(false);
            }
        };
        fetchClients();
    }, []);

    const filteredClients = clients.filter((client) => {
        const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (client.phone?.includes(searchQuery) ?? false);
        const matchesStatus = !statusFilter || client.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <DashboardLayout
            title="Clients"
            subtitle="Manage your roster and track progress"
            actions={
                <Link href="/dashboard/clients/new" className="btn-primary">
                    <Plus size={16} />
                    <span className="hidden sm:inline">ADD CLIENT</span>
                </Link>
            }
        >
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
                    <input
                        type="text"
                        placeholder="Search clients..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-with-icon w-full"
                    />
                </div>

                {/* Status Tabs */}
                <div className="tabs">
                    {[
                        { value: null, label: "All" },
                        { value: "ACTIVE", label: "Active" },
                        { value: "PENDING_PAYMENT", label: "Pending" },
                        { value: "INTAKE_SENT", label: "Intake" },
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

            {/* Table */}
            {loading ? (
                <div className="card overflow-hidden">
                    <div className="data-table-header grid-cols-[1fr_80px_160px_120px_100px_40px]">
                        <span className="label-mono">Name & Contact</span>
                        <span className="label-mono">Channel</span>
                        <span className="label-mono">Status</span>
                        <span className="label-mono">Compliance</span>
                        <span className="label-mono">Last Seen</span>
                        <span></span>
                    </div>
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="skeleton h-[72px]" />
                    ))}
                </div>
            ) : filteredClients.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">
                        <Search className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">
                        {searchQuery ? "No matches found" : "No clients yet"}
                    </h3>
                    <p className="text-text-secondary text-sm mb-6">
                        {searchQuery
                            ? "Try a different search term"
                            : "Add your first client to get started"}
                    </p>
                    {!searchQuery && (
                        <Link href="/dashboard/clients/new" className="btn-primary">
                            <Plus className="w-4 h-4" />
                            ADD CLIENT
                        </Link>
                    )}
                </div>
            ) : (
                <div className="card overflow-hidden">
                    {/* Header */}
                    <div className="data-table-header grid-cols-[1fr_80px_160px_120px_100px_40px]">
                        <span className="label-mono">Name & Contact</span>
                        <span className="label-mono">Channel</span>
                        <span className="label-mono">Status</span>
                        <span className="label-mono">Compliance</span>
                        <span className="label-mono">Last Seen</span>
                        <span></span>
                    </div>

                    {/* Rows */}
                    {filteredClients.map((client) => (
                        <Link
                            key={client.id}
                            href={`/dashboard/clients/${client.id}`}
                            className="data-table-row grid-cols-[1fr_80px_160px_120px_100px_40px] group"
                        >
                            <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-medium text-text-primary group-hover:text-brand-green transition-colors">
                                    {client.name}
                                </span>
                                <span className="text-xs text-text-faint font-mono">
                                    {client.phone || "Telegram"}
                                </span>
                            </div>

                            <div className="flex items-center">
                                {client.preferredChannel === "TELEGRAM" ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-blue">
                                        <Send className="w-3 h-3" />
                                        TG
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-green">
                                        <MessageSquare className="w-3 h-3" />
                                        WA
                                    </span>
                                )}
                            </div>

                            <div className="flex">
                                <StatusBadge status={client.status} />
                            </div>

                            <ComplianceBar value={client.compliance || 0} />

                            <span className="text-xs text-text-faint font-mono">
                                {client.lastCheckIn ? formatRelative(client.lastCheckIn) : "Never"}
                            </span>

                            <ArrowUpRight className="w-4 h-4 text-text-muted group-hover:text-brand-green transition-all transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </Link>
                    ))}
                </div>
            )}

            {/* Count */}
            <p className="text-sm text-text-faint mt-4">
                {filteredClients.length} client{filteredClients.length !== 1 ? "s" : ""}
            </p>
        </DashboardLayout>
    );
}

function ComplianceBar({ value }: { value: number }) {
    const color = complianceColor(value);

    return (
        <div className="flex items-center gap-2">
            <div className="progress-bar w-16">
                <div
                    className="progress-bar-fill"
                    style={{ width: `${value}%`, backgroundColor: color }}
                />
            </div>
            <span className="text-[10px] font-mono text-text-secondary tabular-nums">
                {value}%
            </span>
        </div>
    );
}
