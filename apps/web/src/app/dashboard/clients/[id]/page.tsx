"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import {
    ArrowLeft, Mail, Phone, MessageSquare, Calendar, Dumbbell,
    TrendingUp, Target, Info, ChevronRight, Edit3, Check, X,
    Loader2
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
    preferredChannel?: string;
    timezone?: string;
    createdAt: string;
    checkIns: CheckIn[];
    assignments: Assignment[];
    workoutLogs: Array<{ id: string }>;
}

interface WorkoutPlan {
    id: string;
    title: string;
    daysPerWeek: number;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function AssignPlanModal({
    clientId,
    onClose,
    onAssigned,
}: {
    clientId: string;
    onClose: () => void;
    onAssigned: (assignment: Assignment) => void;
}) {
    const [plans, setPlans] = useState<WorkoutPlan[]>([]);
    const [selectedPlanId, setSelectedPlanId] = useState("");
    const [startDate, setStartDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [scheduleDays, setScheduleDays] = useState<number[]>([1, 3, 5]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const token = localStorage.getItem("token");
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/plans`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => res.json())
            .then((data) => {
                setPlans(data);
                if (data.length > 0) setSelectedPlanId(data[0].id);
            })
            .catch(() => setError("Failed to load plans"))
            .finally(() => setLoading(false));
    }, []);

    const toggleDay = (day: number) => {
        setScheduleDays((prev) =>
            prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
        );
    };

    const handleAssign = async () => {
        if (!selectedPlanId || scheduleDays.length === 0) return;
        setSaving(true);
        setError("");

        try {
            const token = localStorage.getItem("token");
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/clients/${clientId}/assignments`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        planId: selectedPlanId,
                        startDate,
                        scheduleDays,
                    }),
                }
            );

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to assign plan");
            }

            const assignment = await res.json();
            const plan = plans.find((p) => p.id === selectedPlanId);
            onAssigned({
                ...assignment,
                plan: { id: selectedPlanId, title: plan?.title || "" },
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg card-elevated p-6 animate-scale-in">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Dumbbell className="w-5 h-5 text-brand-green" />
                        Assign Workout Plan
                    </h2>
                    <button onClick={onClose} className="btn-icon !p-1.5">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-6 h-6 text-text-faint animate-spin" />
                    </div>
                ) : plans.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-text-secondary mb-4">No workout plans created yet.</p>
                        <Link href="/dashboard/plans/new" className="btn-primary">
                            Create a Plan
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {/* Plan select */}
                        <div className="form-field">
                            <label className="label-mono">Workout Plan</label>
                            <select
                                value={selectedPlanId}
                                onChange={(e) => setSelectedPlanId(e.target.value)}
                                className="select w-full"
                            >
                                {plans.map((plan) => (
                                    <option key={plan.id} value={plan.id}>
                                        {plan.title} ({plan.daysPerWeek} days/week)
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Start date */}
                        <div className="form-field">
                            <label className="label-mono">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="input w-full"
                            />
                        </div>

                        {/* Schedule days */}
                        <div className="form-field">
                            <label className="label-mono">Training Days</label>
                            <div className="flex gap-2 mt-1">
                                {DAY_LABELS.map((label, idx) => {
                                    const dayNum = idx + 1;
                                    const isSelected = scheduleDays.includes(dayNum);
                                    return (
                                        <button
                                            key={dayNum}
                                            type="button"
                                            onClick={() => toggleDay(dayNum)}
                                            className={`w-10 h-10 rounded-lg text-xs font-semibold transition-all ${
                                                isSelected
                                                    ? "bg-brand-green text-black"
                                                    : "bg-bg-secondary border border-border text-text-faint hover:border-text-faint"
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {error && <p className="text-sm text-brand-red">{error}</p>}

                        <div className="flex justify-end gap-3 pt-2">
                            <button onClick={onClose} className="btn-secondary">
                                Cancel
                            </button>
                            <button
                                onClick={handleAssign}
                                disabled={saving || scheduleDays.length === 0}
                                className="btn-primary disabled:opacity-50"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Assigning...
                                    </>
                                ) : (
                                    "Assign Plan"
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function EditableField({
    value,
    onSave,
    label,
    multiline,
    type = "text",
    placeholder,
}: {
    value: string;
    onSave: (val: string) => void;
    label: string;
    multiline?: boolean;
    type?: string;
    placeholder?: string;
}) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);

    const handleSave = () => {
        if (draft !== value) onSave(draft);
        setEditing(false);
    };

    const handleCancel = () => {
        setDraft(value);
        setEditing(false);
    };

    if (!editing) {
        return (
            <div
                className="group cursor-pointer"
                onClick={() => {
                    setDraft(value);
                    setEditing(true);
                }}
            >
                {multiline ? (
                    <p className="text-text-secondary text-xs leading-relaxed italic">
                        {value ? `\u201C${value}\u201D` : placeholder || `No ${label.toLowerCase()} yet.`}
                    </p>
                ) : (
                    <p className="text-white text-sm leading-relaxed">
                        {value || placeholder || `No ${label.toLowerCase()} defined.`}
                    </p>
                )}
                <span className="inline-flex items-center gap-1 text-[10px] text-text-muted mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Edit3 className="w-2.5 h-2.5" /> Click to edit
                </span>
            </div>
        );
    }

    const inputClass = "input w-full text-sm";

    return (
        <div className="space-y-2">
            {multiline ? (
                <textarea
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="textarea w-full text-sm"
                    rows={3}
                    placeholder={placeholder}
                />
            ) : (
                <input
                    autoFocus
                    type={type}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className={inputClass}
                    placeholder={placeholder}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") handleSave();
                        if (e.key === "Escape") handleCancel();
                    }}
                />
            )}
            <div className="flex gap-2">
                <button onClick={handleSave} className="btn-primary !py-1 !px-3 !text-xs">
                    <Check className="w-3 h-3" /> Save
                </button>
                <button onClick={handleCancel} className="btn-secondary !py-1 !px-3 !text-xs">
                    Cancel
                </button>
            </div>
        </div>
    );
}

export default function ClientProfilePage() {
    const { id } = useParams();
    const router = useRouter();
    const [client, setClient] = useState<ClientData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

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

    const updateField = useCallback(
        async (field: string, value: string) => {
            if (!client) return;
            setSaveStatus("saving");

            try {
                const token = localStorage.getItem("token");
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/clients/${client.id}`,
                    {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ [field]: value || null }),
                    }
                );

                if (res.ok) {
                    const updated = await res.json();
                    setClient((prev) => (prev ? { ...prev, ...updated } : prev));
                    setSaveStatus("saved");
                    setTimeout(() => setSaveStatus("idle"), 2000);
                }
            } catch (error) {
                console.error("Failed to update client:", error);
                setSaveStatus("idle");
            }
        },
        [client]
    );

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
                <div className="flex items-center gap-3">
                    {saveStatus === "saving" && (
                        <span className="flex items-center gap-1.5 text-xs text-text-faint">
                            <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                        </span>
                    )}
                    {saveStatus === "saved" && (
                        <span className="flex items-center gap-1.5 text-xs text-brand-green">
                            <Check className="w-3 h-3" /> Saved
                        </span>
                    )}
                    <button
                        className="btn-primary"
                        onClick={() => setShowAssignModal(true)}
                    >
                        <Dumbbell className="w-4 h-4" />
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
                                    This client hasn&apos;t been assigned a workout plan yet.
                                </p>
                                <button
                                    className="btn-secondary"
                                    onClick={() => setShowAssignModal(true)}
                                >
                                    Select Plan
                                </button>
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
                                                        &ldquo;{checkIn.notes}&rdquo;
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
                        {/* Editable Details */}
                        <div className="card-elevated p-6 space-y-6">
                            <div>
                                <h4 className="label-mono mb-3 flex items-center gap-2">
                                    <Mail className="w-3 h-3" /> Email
                                </h4>
                                <EditableField
                                    value={client.email || ""}
                                    onSave={(val) => updateField("email", val)}
                                    label="Email"
                                    type="email"
                                    placeholder="Add email address..."
                                />
                            </div>
                            <div className="divider !my-4" />
                            <div>
                                <h4 className="label-mono mb-3 flex items-center gap-2">
                                    <Phone className="w-3 h-3" /> Phone
                                </h4>
                                <EditableField
                                    value={client.phone || ""}
                                    onSave={(val) => updateField("phone", val)}
                                    label="Phone"
                                    type="tel"
                                    placeholder="Add phone number..."
                                />
                            </div>
                        </div>

                        {/* Goals & Notes */}
                        <div className="card-elevated p-6 space-y-6">
                            <div>
                                <h4 className="label-mono mb-3 flex items-center gap-2">
                                    <Target className="w-3 h-3" /> Client Goals
                                </h4>
                                <EditableField
                                    value={client.goals || ""}
                                    onSave={(val) => updateField("goals", val)}
                                    label="Goals"
                                    multiline
                                    placeholder="Add client goals..."
                                />
                            </div>
                            <div className="divider !my-4" />
                            <div>
                                <h4 className="label-mono mb-3 flex items-center gap-2">
                                    <Info className="w-3 h-3" /> Coach Notes
                                </h4>
                                <EditableField
                                    value={client.notes || ""}
                                    onSave={(val) => updateField("notes", val)}
                                    label="Notes"
                                    multiline
                                    placeholder="Add private notes..."
                                />
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

            {/* Assign Plan Modal */}
            {showAssignModal && (
                <AssignPlanModal
                    clientId={client.id}
                    onClose={() => setShowAssignModal(false)}
                    onAssigned={(assignment) => {
                        setClient((prev) =>
                            prev
                                ? {
                                      ...prev,
                                      assignments: [assignment, ...prev.assignments],
                                      status: "PLAN_ASSIGNED",
                                  }
                                : prev
                        );
                        setShowAssignModal(false);
                    }}
                />
            )}
        </DashboardLayout>
    );
}
