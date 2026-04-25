"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import {
    ArrowLeft, Mail, Phone, MessageSquare, Calendar, Dumbbell,
    TrendingUp, Target, Info, ChevronRight, Edit3, Check,
    Loader2, UtensilsCrossed, ShieldAlert
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/ui";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalClose } from "@/components/ui/Modal";
import { getAuthHeaders } from "@/lib/auth";
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

interface MealAssignment {
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

interface WorkoutPlan {
    id: string;
    title: string;
    daysPerWeek: number;
}

interface MealPlanOption {
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
        getAuthHeaders().then((headers) =>
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/plans`, {
            headers,
        }))
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
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/clients/${clientId}/assignments`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(await getAuthHeaders()),
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
        <Modal open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
            <ModalContent>
                <ModalHeader>
                    <ModalTitle className="flex items-center gap-2">
                        <Dumbbell className="w-5 h-5 text-brand-green" aria-hidden="true" />
                        Assign Workout Plan
                    </ModalTitle>
                    <ModalClose />
                </ModalHeader>
                <div className="p-6">
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
                            <label className="label-mono" htmlFor="workoutPlan">Workout Plan</label>
                            <select
                                id="workoutPlan"
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
                            <label className="label-mono" htmlFor="startDate">Start Date</label>
                            <input
                                id="startDate"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="input w-full"
                            />
                        </div>

                        {/* Schedule days */}
                        <div className="form-field">
                            <label className="label-mono" htmlFor="trainingDays">Training Days</label>
                            <div id="trainingDays" className="flex gap-2 mt-1">
                                {DAY_LABELS.map((label, idx) => {
                                    const dayNum = idx + 1;
                                    const isSelected = scheduleDays.includes(dayNum);
                                    return (
                                        <button
                                            key={dayNum}
                                            type="button"
                                            onClick={() => toggleDay(dayNum)}
                                            className={`w-10 h-10 rounded-lg text-xs font-semibold transition-colors ${
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
            </ModalContent>
        </Modal>
    );
}

function AssignMealPlanModal({
    clientId,
    onClose,
    onAssigned,
}: {
    clientId: string;
    onClose: () => void;
    onAssigned: (assignment: MealAssignment) => void;
}) {
    const [plans, setPlans] = useState<MealPlanOption[]>([]);
    const [selectedPlanId, setSelectedPlanId] = useState("");
    const [startDate, setStartDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [scheduleDays, setScheduleDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        getAuthHeaders().then((headers) =>
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/meal-plans`, { headers })
        )
            .then((res) => res.json())
            .then((data) => {
                setPlans(data);
                if (data.length > 0) setSelectedPlanId(data[0].id);
            })
            .catch(() => setError("Failed to load meal plans"))
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
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/clients/${clientId}/meal-assignments`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(await getAuthHeaders()),
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
                throw new Error(data.error || "Failed to assign meal plan");
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
        <Modal open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
            <ModalContent>
                <ModalHeader>
                    <ModalTitle className="flex items-center gap-2">
                        <UtensilsCrossed className="w-5 h-5 text-brand-orange" aria-hidden="true" />
                        Assign Meal Plan
                    </ModalTitle>
                    <ModalClose />
                </ModalHeader>
                <div className="p-6">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-6 h-6 text-text-faint animate-spin" />
                    </div>
                ) : plans.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-text-secondary mb-4">No meal plans created yet.</p>
                        <Link href="/dashboard/meal-plans/new" className="btn-primary">
                            Create a Meal Plan
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-5">
                        <div className="form-field">
                            <label className="label-mono" htmlFor="mealPlan">Meal Plan</label>
                            <select
                                id="mealPlan"
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

                        <div className="form-field">
                            <label className="label-mono" htmlFor="mealStartDate">Start Date</label>
                            <input
                                id="mealStartDate"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="input w-full"
                            />
                        </div>

                        <div className="form-field">
                            <label className="label-mono" htmlFor="mealDays">Meal Days</label>
                            <div id="mealDays" className="flex gap-2 mt-1">
                                {DAY_LABELS.map((label, idx) => {
                                    const dayNum = idx + 1;
                                    const isSelected = scheduleDays.includes(dayNum);
                                    return (
                                        <button
                                            key={dayNum}
                                            type="button"
                                            onClick={() => toggleDay(dayNum)}
                                            className={`w-10 h-10 rounded-lg text-xs font-semibold transition-colors ${
                                                isSelected
                                                    ? "bg-brand-orange text-black"
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
                                    "Assign Meal Plan"
                                )}
                            </button>
                        </div>
                    </div>
                )}
                </div>
            </ModalContent>
        </Modal>
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
            <button
                type="button"
                className="group cursor-pointer text-left w-full"
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
                    <Edit3 className="w-2.5 h-2.5" aria-hidden="true" /> Click to edit
                </span>
            </button>
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
    const [showMealAssignModal, setShowMealAssignModal] = useState(false);
    const [mealAssignments, setMealAssignments] = useState<MealAssignment[]>([]);
    const [riskScore, setRiskScore] = useState<{
        score: number;
        level: string;
        summary: string;
        suggestion: string | null;
        factors: { compliance: number; engagement: number; activity: number; behavioral: number; payment: number };
    } | null>(null);
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
    const [weightRange, setWeightRange] = useState<"7D" | "30D">("30D");

    useEffect(() => {
        const fetchClient = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/clients/${id}`, {
                    headers: await getAuthHeaders(),
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

        const fetchMealAssignments = async () => {
            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/clients/${id}/meal-assignments`,
                    { headers: await getAuthHeaders() }
                );
                if (res.ok) setMealAssignments(await res.json());
            } catch { /* silent */ }
        };
        fetchMealAssignments();

        const fetchRiskScore = async () => {
            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/clients/${id}/risk-score`,
                    { headers: await getAuthHeaders() }
                );
                if (res.ok) setRiskScore(await res.json());
            } catch { /* silent */ }
        };
        fetchRiskScore();
    }, [id, router]);

    const updateField = useCallback(
        async (field: string, value: string) => {
            if (!client) return;
            setSaveStatus("saving");

            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/clients/${client.id}`,
                    {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json",
                            ...(await getAuthHeaders()),
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

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (weightRange === "7D" ? 7 : 30));
    const weightData = [...client.checkIns]
        .reverse()
        .filter((c) => new Date(c.createdAt) >= cutoff)
        .map((c) => ({
            date: formatDate(c.createdAt),
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
                    <button
                        className="btn-secondary"
                        onClick={() => setShowMealAssignModal(true)}
                    >
                        <UtensilsCrossed className="w-4 h-4" />
                        Assign Meals
                    </button>
                    <button
                        className="btn-icon"
                        aria-label="Message client"
                        onClick={() => router.push(`/dashboard/messages?client=${client.id}`)}
                    >
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
                            <h1 className="text-3xl font-bold text-white tracking-tight text-balance">
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
                                    <h3 className="section-title flex items-center gap-2 text-balance">
                                        <TrendingUp className="w-5 h-5 text-brand-blue" />
                                        Weight Trend
                                    </h3>
                                    <div className="tabs" role="tablist">
                                        {(["7D", "30D"] as const).map((range) => (
                                            <button
                                                key={range}
                                                className={weightRange === range ? "tab-active" : "tab"}
                                                role="tab"
                                                aria-selected={weightRange === range}
                                                onClick={() => setWeightRange(range)}
                                            >
                                                {range}
                                            </button>
                                        ))}
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
                                    <h2 className="text-2xl font-bold text-white mb-2 text-balance">
                                        {activeAssignment.plan.title}
                                    </h2>
                                    <p className="text-text-secondary text-sm mb-6 max-w-md text-pretty">
                                        Started on {formatDate(activeAssignment.startDate)}
                                    </p>
                                    <div className="flex gap-6">
                                        <div className="stat-card">
                                            <p className="label-mono mb-1">Compliance</p>
                                            <p className="text-xl font-bold text-white tabular-nums">
                                                {activeAssignment.compliance}%
                                            </p>
                                        </div>
                                        <div className="stat-card">
                                            <p className="label-mono mb-1">Days/Week</p>
                                            <p className="text-xl font-bold text-white tabular-nums">
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
                                <h3 className="text-lg font-bold text-white mb-1 text-balance">No Active Plan</h3>
                                <p className="text-text-secondary text-sm mb-6 text-pretty">
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

                        {/* Active Meal Plan Card */}
                        {(() => {
                            const activeMealAssignment = mealAssignments.find((a) => a.isActive);
                            return activeMealAssignment ? (
                                <div className="card-elevated p-8 overflow-hidden relative">
                                    <div className="absolute top-0 right-0 p-8 text-brand-orange/10 -rotate-12 translate-x-4 -translate-y-4">
                                        <UtensilsCrossed className="w-32 h-32" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 text-brand-orange font-bold uppercase tracking-[0.2em] text-[10px] mb-4">
                                            <UtensilsCrossed className="w-3 h-3" />
                                            Active Meal Plan
                                        </div>
                                        <h2 className="text-2xl font-bold text-white mb-2 text-balance">
                                            {activeMealAssignment.plan.title}
                                        </h2>
                                        <p className="text-text-secondary text-sm mb-6 max-w-md text-pretty">
                                            Started on {formatDate(activeMealAssignment.startDate)}
                                        </p>
                                        <div className="flex gap-6">
                                            <div className="stat-card">
                                                <p className="label-mono mb-1">Compliance</p>
                                                <p className="text-xl font-bold text-white tabular-nums">
                                                    {activeMealAssignment.compliance}%
                                                </p>
                                            </div>
                                            <div className="stat-card">
                                                <p className="label-mono mb-1">Days/Week</p>
                                                <p className="text-xl font-bold text-white tabular-nums">
                                                    {activeMealAssignment.scheduleDays.length}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="card p-8 flex flex-col items-center justify-center text-center border-dashed">
                                    <div className="empty-state-icon mb-4">
                                        <UtensilsCrossed className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-1 text-balance">No Meal Plan</h3>
                                    <p className="text-text-secondary text-sm mb-6 text-pretty">
                                        This client hasn&apos;t been assigned a meal plan yet.
                                    </p>
                                    <button
                                        className="btn-secondary"
                                        onClick={() => setShowMealAssignModal(true)}
                                    >
                                        Assign Meal Plan
                                    </button>
                                </div>
                            );
                        })()}

                        {/* Check-ins */}
                        <div>
                            <div className="section-header">
                                <h3 className="section-title text-balance">Recent Check-ins</h3>
                                <span className="badge badge-blue">{client.checkIns.length} total</span>
                            </div>
                            {client.checkIns.length === 0 ? (
                                <p className="text-text-secondary">No check-ins yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {client.checkIns.slice(0, 5).map((checkIn) => (
                                        <div
                                            key={checkIn.id}
                                            className="card p-4 flex items-start justify-between group hover:bg-bg-hover transition-colors"
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
                                    placeholder="Add email address\u2026"
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
                                    placeholder="Add phone number\u2026"
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
                                    placeholder="Add client goals\u2026"
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
                                    placeholder="Add private notes\u2026"
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

                        {/* Risk Assessment */}
                        {riskScore && (
                            <div className="card-elevated p-5">
                                <h4 className="label-mono mb-3 flex items-center gap-2">
                                    <ShieldAlert className="w-3 h-3" /> Risk Assessment
                                </h4>
                                <div className="flex items-center gap-3 mb-3">
                                    <span className={`text-2xl font-bold ${
                                        riskScore.level === "CRITICAL" ? "text-brand-red" :
                                        riskScore.level === "HIGH" ? "text-brand-orange" :
                                        riskScore.level === "MODERATE" ? "text-yellow-500" :
                                        "text-brand-green"
                                    }`}>
                                        {riskScore.score}
                                    </span>
                                    <span className={`text-[9px] font-bold tracking-widest px-2 py-0.5 rounded-full ${
                                        riskScore.level === "CRITICAL" ? "bg-brand-red text-white" :
                                        riskScore.level === "HIGH" ? "bg-brand-orange text-white" :
                                        riskScore.level === "MODERATE" ? "bg-yellow-500 text-black" :
                                        "bg-brand-green text-black"
                                    }`}>
                                        {riskScore.level}
                                    </span>
                                </div>
                                <p className="text-xs text-text-secondary mb-3 text-pretty">{riskScore.summary}</p>
                                {riskScore.suggestion && (
                                    <div className="bg-bg-secondary/50 rounded-lg p-3 border border-border">
                                        <p className="text-[9px] font-mono text-text-faint uppercase tracking-wider mb-1">Suggested Action</p>
                                        <p className="text-xs text-text-primary text-pretty">{riskScore.suggestion}</p>
                                    </div>
                                )}
                                <div className="mt-3 space-y-1.5">
                                    {[
                                        { label: "Compliance", value: riskScore.factors.compliance },
                                        { label: "Engagement", value: riskScore.factors.engagement },
                                        { label: "Activity", value: riskScore.factors.activity },
                                        { label: "Behavioral", value: riskScore.factors.behavioral },
                                    ].map(({ label, value }) => (
                                        <div key={label} className="flex items-center gap-2">
                                            <span className="text-[9px] font-mono text-text-faint w-20 uppercase tracking-wider">{label}</span>
                                            <div className="flex-1 h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-[width] ${
                                                        value >= 70 ? "bg-brand-red" : value >= 40 ? "bg-yellow-500" : "bg-brand-green"
                                                    }`}
                                                    style={{ width: `${Math.max(2, value)}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Member Since */}
                        <div className="card p-4">
                            <p className="label-mono mb-1">Member Since</p>
                            <p className="text-sm text-white">{formatDate(client.createdAt)}</p>
                        </div>
                    </div>
                </div>

            {/* Assign Workout Plan Modal */}
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

            {/* Assign Meal Plan Modal */}
            {showMealAssignModal && (
                <AssignMealPlanModal
                    clientId={client.id}
                    onClose={() => setShowMealAssignModal(false)}
                    onAssigned={(assignment) => {
                        setMealAssignments((prev) => [assignment, ...prev]);
                        setShowMealAssignModal(false);
                    }}
                />
            )}
        </DashboardLayout>
    );
}
