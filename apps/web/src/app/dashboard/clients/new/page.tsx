"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ArrowLeft, User, Phone, Mail, Target, FileText, Send } from "lucide-react";
import { getAuthHeaders } from "@/lib/auth";

type ClientStatus = "PENDING_PAYMENT" | "INTAKE_SENT" | "ACTIVE";

interface FormData {
    name: string;
    phone: string;
    email: string;
    goals: string;
    notes: string;
    status: ClientStatus;
    sendIntake: boolean;
}

export default function NewClientPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<FormData>({
        name: "",
        phone: "",
        email: "",
        goals: "",
        notes: "",
        status: "PENDING_PAYMENT",
        sendIntake: true,
    });

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value, type } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/clients`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(await getAuthHeaders()),
                },
                body: JSON.stringify({
                    name: formData.name,
                    phone: formData.phone,
                    email: formData.email || undefined,
                    goals: formData.goals || undefined,
                    notes: formData.notes || undefined,
                    status: formData.status,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Failed to create client");
            }

            const client = await response.json();

            if (formData.sendIntake && formData.status === "INTAKE_SENT") {
                await fetch(`${process.env.NEXT_PUBLIC_API_URL}/clients/${client.id}/send-intake`, {
                    method: "POST",
                    headers: await getAuthHeaders(),
                });
            }

            router.push(`/dashboard/clients/${client.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
            setLoading(false);
        }
    };

    return (
        <DashboardLayout title="Add New Client" subtitle="Onboard a new client to your roster">
            <div className="max-w-2xl mx-auto">
                {/* Back link */}
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-text-faint hover:text-white transition-colors mb-6 sm:mb-8 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" aria-hidden="true" />
                    Back to Dashboard
                </Link>

                <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                    {/* Basic Info Card */}
                    <div className="card p-4 sm:p-6">
                        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2 text-balance">
                            <User className="w-5 h-5 text-brand-blue" aria-hidden="true" />
                            Basic Information
                        </h2>

                        <div className="space-y-5">
                            <div className="form-field">
                                <label htmlFor="name" className="label-mono">Full Name *</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    required
                                    autoComplete="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="input w-full"
                                    placeholder="e.g. John Smith"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="form-field">
                                    <label htmlFor="phone" className="label-mono flex items-center gap-2">
                                        <Phone className="w-3 h-3" aria-hidden="true" />
                                        WhatsApp Number *
                                    </label>
                                    <input
                                        type="tel"
                                        id="phone"
                                        name="phone"
                                        required
                                        autoComplete="tel"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="input w-full"
                                        placeholder="+44 7700 900123"
                                    />
                                    <p className="text-[10px] text-text-faint mt-1">
                                        Include country code for WhatsApp delivery
                                    </p>
                                </div>

                                <div className="form-field">
                                    <label htmlFor="email" className="label-mono flex items-center gap-2">
                                        <Mail className="w-3 h-3" aria-hidden="true" />
                                        Email (Optional)
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        autoComplete="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="input w-full"
                                        placeholder="john@example.com"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Goals & Notes Card */}
                    <div className="card p-6">
                        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2 text-balance">
                            <Target className="w-5 h-5 text-brand-green" aria-hidden="true" />
                            Goals & Notes
                        </h2>

                        <div className="space-y-5">
                            <div className="form-field">
                                <label htmlFor="goals" className="label-mono">Client Goals</label>
                                <textarea
                                    id="goals"
                                    name="goals"
                                    value={formData.goals}
                                    onChange={handleChange}
                                    className="textarea w-full"
                                    placeholder="e.g. Lose 10kg, build muscle, improve energy levels…"
                                    rows={3}
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="notes" className="label-mono flex items-center gap-2">
                                    <FileText className="w-3 h-3" aria-hidden="true" />
                                    Coach Notes (Private)
                                </label>
                                <textarea
                                    id="notes"
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    className="textarea w-full"
                                    placeholder="Any notes about this client (only visible to you)…"
                                    rows={3}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Onboarding Settings Card */}
                    <div className="card p-6">
                        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2 text-balance">
                            <Send className="w-5 h-5 text-brand-violet" aria-hidden="true" />
                            Onboarding
                        </h2>

                        <div className="space-y-5">
                            <div className="form-field">
                                <label htmlFor="status" className="label-mono">Initial Status</label>
                                <select
                                    id="status"
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="select w-full"
                                >
                                    <option value="PENDING_PAYMENT">Pending Payment</option>
                                    <option value="INTAKE_SENT">Send Intake Form</option>
                                    <option value="ACTIVE">Active (Skip Onboarding)</option>
                                </select>
                                <p className="text-[10px] text-text-faint mt-1">
                                    {formData.status === "PENDING_PAYMENT" &&
                                        "Client will receive a payment link via WhatsApp"}
                                    {formData.status === "INTAKE_SENT" &&
                                        "Client will receive an intake questionnaire via WhatsApp"}
                                    {formData.status === "ACTIVE" &&
                                        "Client is ready for plan assignment immediately"}
                                </p>
                            </div>

                            {formData.status === "INTAKE_SENT" && (
                                <label htmlFor="sendIntake" className="flex items-center gap-3 p-4 rounded-xl bg-brand-violet/5 border border-brand-violet/20 cursor-pointer hover:bg-brand-violet/10 transition-colors">
                                    <input
                                        type="checkbox"
                                        id="sendIntake"
                                        name="sendIntake"
                                        checked={formData.sendIntake}
                                        onChange={handleChange}
                                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-brand-violet focus:ring-brand-violet/50"
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-white">
                                            Send intake form immediately
                                        </p>
                                        <p className="text-xs text-text-faint text-pretty">
                                            Client will receive a WhatsApp Flow to collect their details
                                        </p>
                                    </div>
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Error */}
                    {error && <div className="form-error-box">{error}</div>}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4">
                        <Link href="/dashboard" className="btn-secondary">
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary"
                        >
                            {loading ? "CREATING..." : "CREATE CLIENT"}
                        </button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
