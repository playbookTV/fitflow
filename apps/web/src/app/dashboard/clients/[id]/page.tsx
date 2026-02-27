"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import {
    ArrowLeft, Mail, Phone, MessageSquare, Calendar, Dumbbell,
    TrendingUp, Target, Info, ChevronRight
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/ui";
import { DashboardLayout } from "@/components/DashboardLayout";

interface CheckIn {
    id: string;
    weight: number;
    energyLevel: number;
    sleepQuality: number;
    notes?: string;
    createdAt: string;
}

interface Assignment {
    id: string;
    isActive: boolean;
    startDate: string;
    compliance: number;
    scheduleDays: number[];
    plan: {
        id: string;
        title: string;
    };
}

interface ClientData {
    id: string;
    name: string;
    email?: string;
    phone: string;
    status: string;
    goals?: string;
    notes?: string;
    createdAt: string;
    checkIns: CheckIn[];
    assignments: Assignment[];
    workoutLogs: Array<{ id: string }>;
}

export default function ClientProfilePage() {
    const { id } = useParams();
    const router = useRouter();
    const [client, setClient] = useState<ClientData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchClient = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/clients/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    setClient(await res.json());
                } else {
                    router.push("/dashboard/clients");
                }
            } catch (error) {
                console.error("Fetch client error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchClient();
    }, [id, router]);

    if (loading) {
        return (
            <DashboardLayout title="Client Profile" subtitle="Loading...">
                <div className="animate-pulse">
                    <div className="skeleton h-8 w-48 rounded-lg mb-8" />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            <div className="skeleton h-64 rounded-2xl" />
                            <div className="skeleton h-64 rounded-2xl" />
                        </div>
                        <div className="skeleton h-96 rounded-2xl" />
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!client) return null;

    const weightData = [...client.checkIns].reverse().map((c) => ({
        date: new Date(c.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
        weight: c.weight,
    }));

    const activeAssignment = client.assignments.find((a) => a.isActive);

    return (
        <DashboardLayout
            title={client.name}
            subtitle="Client Profile"
            actions={
                <div className="flex gap-3">
                    <button className="btn-primary">
                        Assign Plan
                    </button>
                    <button className="btn-icon">
                        <MessageSquare className="w-5 h-5" />
                    </button>
                </div>
            }
        >
            {/* Back Nav */}
            <Link
                href="/dashboard/clients"
                className="inline-flex items-center gap-2 text-text-faint hover:text-white transition-colors mb-8 group"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                Back to Clients
            </Link>

            {/* Profile Header */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-6 mb-12">
                <div className="flex items-center gap-6">
                    <div className="avatar-lg bg-gradient-to-br from-brand-blue to-brand-violet text-white shadow-glow-blue">
                        {client.name.charAt(0)}
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-3xl font-bold text-white tracking-tight">
                                {client.name}
                            </h1>
                            <StatusBadge status={client.status} />
                        </div>
                        <div className="flex items-center gap-4 text-text-secondary text-sm">
                            {client.email && (
                                <span className="flex items-center gap-1.5">
                                    <Mail className="w-3.5 h-3.5" />
                                    {client.email}
                                </span>
                            )}
                            <span className="flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5" />
                                {client.phone}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Weight Trend */}
                        {weightData.length > 0 && (
                            <div className="chart-container">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="section-title flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-brand-blue" />
                                        Weight Trend
                                    </h3>
                                    <div className="tabs">
                                        <button className="tab">7D</button>
                                        <button className="tab-active">30D</button>
                                    </div>
                                </div>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={weightData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1f1f24" vertical={false} />
                                            <XAxis
                                                dataKey="date"
                                                stroke="#606065"
                                                fontSize={12}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <YAxis
                                                stroke="#606065"
                                                fontSize={12}
                                                tickLine={false}
                                                axisLine={false}
                                                domain={['dataMin - 2', 'dataMax + 2']}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: "#1e1e22",
                                                    border: "1px solid #1f1f24",
                                                    borderRadius: "12px",
                                                }}
                                                labelStyle={{ color: "#a0a0a5" }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="weight"
                                                stroke="#4E97F8"
                                                strokeWidth={3}
                                                dot={{ r: 4, fill: "#4E97F8", strokeWidth: 2, stroke: "#0a0a0b" }}
                                                activeDot={{ r: 6, fill: "#4E97F8", strokeWidth: 0 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Active Plan Card */}
                        {activeAssignment ? (
                            <div className="card-elevated p-8 overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-8 text-brand-blue/10 -rotate-12 translate-x-4 -translate-y-4">
                                    <Dumbbell className="w-32 h-32" />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 text-brand-blue font-bold uppercase tracking-[0.2em] text-[10px] mb-4">
                                        <Calendar className="w-3 h-3" />
                                        Active Program
                                    </div>
                                    <h2 className="text-2xl font-bold text-white mb-2">
                                        {activeAssignment.plan.title}
                                    </h2>
                                    <p className="text-text-secondary text-sm mb-6 max-w-md">
                                        Started on {formatDate(activeAssignment.startDate)}
                                    </p>
                                    <div className="flex gap-6">
                                        <div className="stat-card">
                                            <p className="label-mono mb-1">Compliance</p>
                                            <p className="text-xl font-bold text-white">
                                                {activeAssignment.compliance}%
                                            </p>
                                        </div>
                                        <div className="stat-card">
                                            <p className="label-mono mb-1">Days/Week</p>
                                            <p className="text-xl font-bold text-white">
                                                {activeAssignment.scheduleDays.length}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="card p-12 flex flex-col items-center justify-center text-center border-dashed">
                                <div className="empty-state-icon mb-4">
                                    <Target className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1">No Active Plan</h3>
                                <p className="text-text-secondary text-sm mb-6">
                                    This client hasn't been assigned a workout plan yet.
                                </p>
                                <button className="btn-secondary">Select Plan</button>
                            </div>
                        )}

                        {/* Check-ins */}
                        <div>
                            <div className="section-header">
                                <h3 className="section-title">Recent Check-ins</h3>
                                <span className="badge badge-blue">{client.checkIns.length} total</span>
                            </div>
                            {client.checkIns.length === 0 ? (
                                <p className="text-text-secondary">No check-ins yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {client.checkIns.slice(0, 5).map((checkIn) => (
                                        <div
                                            key={checkIn.id}
                                            className="card p-4 flex items-start justify-between group hover:bg-bg-hover transition-colors cursor-pointer"
                                        >
                                            <div>
                                                <p className="label-mono mb-2">
                                                    {formatDate(checkIn.createdAt)}
                                                </p>
                                                <div className="flex items-center gap-4 text-sm">
                                                    <span className="text-white font-semibold">{checkIn.weight} kg</span>
                                                    <span className="text-text-secondary">Energy: {checkIn.energyLevel}/10</span>
                                                    <span className="text-text-secondary">Sleep: {checkIn.sleepQuality}/10</span>
                                                </div>
                                                {checkIn.notes && (
                                                    <p className="text-sm text-text-faint mt-2 italic">
                                                        "{checkIn.notes}"
                                                    </p>
                                                )}
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-white transition-colors" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Goals & Notes */}
                        <div className="card-elevated p-6 space-y-6">
                            <div>
                                <h4 className="label-mono mb-3 flex items-center gap-2">
                                    <Target className="w-3 h-3" /> Client Goals
                                </h4>
                                <p className="text-white text-sm leading-relaxed">
                                    {client.goals || "No goals defined."}
                                </p>
                            </div>
                            <div className="divider !my-4" />
                            <div>
                                <h4 className="label-mono mb-3 flex items-center gap-2">
                                    <Info className="w-3 h-3" /> Coach Notes
                                </h4>
                                <p className="text-text-secondary text-xs leading-relaxed italic">
                                    "{client.notes || "No notes yet."}"
                                </p>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="stat-card">
                                <p className="label-mono mb-2">Check-ins</p>
                                <p className="text-2xl font-bold text-white">{client.checkIns.length}</p>
                            </div>
                            <div className="stat-card">
                                <p className="label-mono mb-2">Workouts</p>
                                <p className="text-2xl font-bold text-white">{client.workoutLogs.length}</p>
                            </div>
                        </div>

                        {/* Member Since */}
                        <div className="card p-4">
                            <p className="label-mono mb-1">Member Since</p>
                            <p className="text-sm text-white">{formatDate(client.createdAt)}</p>
                        </div>
                    </div>
                </div>
        </DashboardLayout>
    );
}
