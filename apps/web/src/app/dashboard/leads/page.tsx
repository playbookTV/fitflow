"use client";

import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
    UserPlus,
    ArrowRight,
    Send,
    MessageSquare,
    CheckCheck,
    ClipboardList,
} from "lucide-react";
import { cn, formatRelative } from "@/lib/utils";
import { formatTime } from "@/lib/tokens";
import { getAuthHeaders } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";

interface IntakeData {
    step?: string;
    name?: string;
    age?: number;
    gender?: string;
    goal?: string;
    weight?: string;
    agreedToTerms?: boolean;
}

interface Lead {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    channelTag: "WHATSAPP" | "TELEGRAM";
    source: string | null;
    status: "NEW" | "INTAKE_COMPLETE" | "PAYMENT_PENDING" | "CONVERTED" | "REJECTED";
    offer: { name: string; slug: string } | null;
    intakeData: IntakeData | null;
    unreadCount: number;
    createdAt: string;
}

interface LeadMessage {
    id: string;
    content: string;
    direction: "INBOUND" | "OUTBOUND";
    status: string | null;
    createdAt: string;
}

const STATUS_LABELS: Record<Lead["status"], string> = {
    NEW: "New",
    INTAKE_COMPLETE: "Intake Done",
    PAYMENT_PENDING: "Awaiting Payment",
    CONVERTED: "Converted",
    REJECTED: "Rejected",
};

const STATUS_COLORS: Record<Lead["status"], string> = {
    NEW: "badge-blue",
    INTAKE_COMPLETE: "badge-orange",
    PAYMENT_PENDING: "badge-violet",
    CONVERTED: "badge-green",
    REJECTED: "badge-red",
};

const avatarGradients = [
    "from-brand-blue to-brand-violet",
    "from-brand-green to-brand-cyan",
    "from-brand-violet to-brand-red",
    "from-brand-orange to-brand-red",
    "from-brand-cyan to-brand-blue",
];

const getAvatarGradient = (name: string) => {
    const index = name.charCodeAt(0) % avatarGradients.length;
    return avatarGradients[index];
};

export default function LeadsPage() {
    const { toast } = useToast();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [converting, setConverting] = useState<string | null>(null);
    const [startingIntake, setStartingIntake] = useState<string | null>(null);

    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [messages, setMessages] = useState<LeadMessage[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);

    const fetchLeads = useCallback(async () => {
        try {
            const url = statusFilter === "ALL"
                ? `${process.env.NEXT_PUBLIC_API_URL}/leads`
                : `${process.env.NEXT_PUBLIC_API_URL}/leads?status=${statusFilter}`;
            const res = await fetch(url, {
                headers: await getAuthHeaders(),
            });
            if (res.ok) {
                setLeads(await res.json());
            } else {
                toast({
                    variant: "error",
                    title: "Failed to load leads",
                    description: res.status === 401
                        ? "Please sign in again."
                        : "Something went wrong. Please try again.",
                });
            }
        } catch (error) {
            console.error("Failed to fetch leads:", error);
            toast({
                variant: "error",
                title: "Failed to load leads",
                description: "Could not reach the server. Check your connection.",
            });
        } finally {
            setLoading(false);
        }
    }, [statusFilter, toast]);

    useEffect(() => { fetchLeads(); }, [fetchLeads]);

    const fetchMessages = useCallback(async (leadId: string) => {
        setLoadingMessages(true);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/leads/${leadId}/messages`,
                { headers: await getAuthHeaders() }
            );
            if (res.ok) setMessages(await res.json());
        } catch (error) {
            console.error("Failed to fetch messages:", error);
        } finally {
            setLoadingMessages(false);
        }
    }, []);

    const handleSelectLead = (lead: Lead) => {
        setSelectedLead(lead);
        setMessages([]);
        fetchMessages(lead.id);
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedLead || sending) return;
        setSending(true);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/leads/${selectedLead.id}/messages`,
                {
                    method: "POST",
                    headers: {
                        ...(await getAuthHeaders()),
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ content: newMessage }),
                }
            );
            if (res.ok) {
                const msg = await res.json();
                setMessages((prev) => [...prev, msg]);
                setNewMessage("");
            }
        } catch (error) {
            console.error("Failed to send message:", error);
        } finally {
            setSending(false);
        }
    };

    const handleConvert = async (leadId: string) => {
        setConverting(leadId);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/leads/${leadId}/convert`,
                {
                    method: "POST",
                    headers: await getAuthHeaders(),
                }
            );
            if (res.ok) {
                if (selectedLead?.id === leadId) {
                    setSelectedLead(null);
                    setMessages([]);
                }
                fetchLeads();
            }
        } catch (error) {
            console.error("Failed to convert lead:", error);
        } finally {
            setConverting(null);
        }
    };

    const handleStartIntake = async (leadId: string) => {
        setStartingIntake(leadId);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/leads/${leadId}/start-intake`,
                {
                    method: "POST",
                    headers: await getAuthHeaders(),
                }
            );
            if (res.ok) fetchLeads();
        } catch (error) {
            console.error("Failed to start intake:", error);
        } finally {
            setStartingIntake(null);
        }
    };

    const filters = ["ALL", "NEW", "INTAKE_COMPLETE", "PAYMENT_PENDING", "CONVERTED"];
    const totalUnread = leads.reduce((sum, l) => sum + l.unreadCount, 0);

    return (
        <DashboardLayout
            title="Lead Pipeline"
            subtitle="Track and convert incoming leads"
            notifications={totalUnread}
        >
            {/* Status Filters */}
            <div className="flex gap-2 mb-4 flex-wrap">
                {filters.map((f) => (
                    <button
                        key={f}
                        onClick={() => setStatusFilter(f)}
                        className={cn(
                            "px-4 py-2 rounded-xl text-sm font-medium transition-colors",
                            statusFilter === f
                                ? "bg-brand-green/10 text-brand-green border border-brand-green/20"
                                : "bg-bg-hover text-text-secondary hover:text-white"
                        )}
                    >
                        {f === "ALL" ? "All" : STATUS_LABELS[f as Lead["status"]]}
                    </button>
                ))}
            </div>

            <div className="flex h-[calc(100dvh-220px)] rounded-2xl overflow-hidden border border-border bg-bg-card">
                {/* Lead List */}
                <div className={cn(
                    "w-full md:w-80 lg:w-96 border-r border-border flex flex-col bg-bg-primary",
                    selectedLead && "hidden md:flex"
                )}>
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="skeleton h-16 rounded-xl" />
                                ))}
                            </div>
                        ) : leads.length === 0 ? (
                            <div className="p-8 text-center">
                                <UserPlus className="w-8 h-8 text-text-muted mx-auto mb-3" />
                                <p className="text-text-secondary text-sm">No leads yet</p>
                                <p className="text-text-faint text-xs mt-1 text-pretty">
                                    Share your offer links to start capturing leads.
                                </p>
                            </div>
                        ) : (
                            leads.map((lead) => (
                                <button
                                    key={lead.id}
                                    onClick={() => handleSelectLead(lead)}
                                    className={cn(
                                        "w-full p-4 flex items-start gap-3 hover:bg-bg-hover transition-colors text-left border-b border-border/50",
                                        selectedLead?.id === lead.id && "bg-bg-hover"
                                    )}
                                >
                                    <div className={cn(
                                        "w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm shrink-0",
                                        getAvatarGradient(lead.name)
                                    )}>
                                        {lead.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-medium text-white text-sm truncate flex items-center gap-1.5">
                                                {lead.name}
                                                <span className={cn(
                                                    "text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0",
                                                    lead.channelTag === "TELEGRAM"
                                                        ? "text-brand-blue bg-brand-blue/10"
                                                        : "text-brand-green bg-brand-green/10"
                                                )}>
                                                    {lead.channelTag === "TELEGRAM" ? "TG" : "WA"}
                                                </span>
                                            </span>
                                            <span className="text-[10px] text-text-faint shrink-0">
                                                {formatRelative(lead.createdAt)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-xs text-text-faint truncate">
                                                <span className={cn("badge !text-[9px] !px-1.5 !py-0", STATUS_COLORS[lead.status])}>
                                                    {STATUS_LABELS[lead.status]}
                                                </span>
                                                {lead.offer && (
                                                    <span className="truncate">{lead.offer.name}</span>
                                                )}
                                            </div>
                                            {lead.unreadCount > 0 && (
                                                <span className="w-5 h-5 rounded-full bg-brand-green text-[10px] font-bold flex items-center justify-center text-white shrink-0 tabular-nums">
                                                    {lead.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Chat Panel */}
                <div className={cn(
                    "flex-1 flex flex-col",
                    !selectedLead && "hidden md:flex"
                )}>
                    {selectedLead ? (
                        <>
                            {/* Chat Header */}
                            <div className="h-16 px-4 border-b border-border flex items-center justify-between bg-bg-secondary">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setSelectedLead(null)}
                                        className="md:hidden p-2 -ml-2 text-text-faint hover:text-white"
                                        aria-label="Back to leads"
                                    >
                                        ←
                                    </button>
                                    <div className={cn(
                                        "w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm",
                                        getAvatarGradient(selectedLead.name)
                                    )}>
                                        {selectedLead.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-medium text-white text-sm flex items-center gap-2">
                                            {selectedLead.name}
                                            <span className={cn(
                                                "text-[9px] font-bold px-1.5 py-0.5 rounded",
                                                selectedLead.channelTag === "TELEGRAM"
                                                    ? "text-brand-blue bg-brand-blue/10"
                                                    : "text-brand-green bg-brand-green/10"
                                            )}>
                                                {selectedLead.channelTag === "TELEGRAM" ? "Telegram" : "WhatsApp"}
                                            </span>
                                            <span className={cn("badge !text-[9px]", STATUS_COLORS[selectedLead.status])}>
                                                {STATUS_LABELS[selectedLead.status]}
                                            </span>
                                        </p>
                                        <p className="text-[10px] text-text-faint">
                                            {selectedLead.source && `via ${selectedLead.source}`}
                                            {selectedLead.offer && ` · ${selectedLead.offer.name}`}
                                        </p>
                                        {selectedLead.intakeData?.step === "complete" && (
                                            <p className="text-[10px] text-text-faint">
                                                {[
                                                    selectedLead.intakeData.goal,
                                                    selectedLead.intakeData.age && `${selectedLead.intakeData.age}y`,
                                                    selectedLead.intakeData.gender,
                                                    selectedLead.intakeData.weight,
                                                ].filter(Boolean).join(" · ")}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {selectedLead.status !== "CONVERTED" && selectedLead.status !== "REJECTED" &&
                                        selectedLead.channelTag === "TELEGRAM" &&
                                        selectedLead.intakeData?.step !== "complete" && (
                                        <button
                                            onClick={() => handleStartIntake(selectedLead.id)}
                                            disabled={startingIntake === selectedLead.id}
                                            className="btn-ghost text-brand-blue hover:text-brand-blue flex items-center gap-1 text-sm"
                                        >
                                            <ClipboardList className="w-3.5 h-3.5" />
                                            Start Intake
                                        </button>
                                    )}
                                    {selectedLead.status !== "CONVERTED" && selectedLead.status !== "REJECTED" && (
                                        <button
                                            onClick={() => handleConvert(selectedLead.id)}
                                            disabled={converting === selectedLead.id}
                                            className="btn-ghost text-brand-green hover:text-brand-green flex items-center gap-1 text-sm"
                                        >
                                            Convert
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-bg-primary/50">
                                {loadingMessages ? (
                                    <div className="space-y-4">
                                        {[1, 2].map((i) => (
                                            <div key={i} className="skeleton h-12 rounded-xl max-w-[60%]" />
                                        ))}
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
                                        <MessageSquare className="w-8 h-8 text-text-muted mb-3" />
                                        <p className="text-text-secondary text-sm">No messages yet</p>
                                        <p className="text-text-faint text-xs mt-1 text-pretty">
                                            Send a message to start the conversation.
                                        </p>
                                    </div>
                                ) : (
                                    messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={cn(
                                                "flex",
                                                msg.direction === "OUTBOUND" ? "justify-end" : "justify-start"
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    "max-w-[75%] rounded-2xl px-4 py-2.5",
                                                    msg.direction === "OUTBOUND"
                                                        ? "bg-brand-green text-white rounded-br-md"
                                                        : "bg-bg-card text-white rounded-bl-md border border-border"
                                                )}
                                            >
                                                <p className="text-sm">{msg.content}</p>
                                                <div className={cn(
                                                    "flex items-center justify-end gap-1 mt-1",
                                                    msg.direction === "OUTBOUND" ? "text-white/60" : "text-text-faint"
                                                )}>
                                                    <span className="text-[10px]">
                                                        {formatTime(msg.createdAt)}
                                                    </span>
                                                    {msg.direction === "OUTBOUND" && (
                                                        <CheckCheck className={cn(
                                                            "w-3.5 h-3.5",
                                                            msg.status === "read" && "text-brand-blue"
                                                        )} />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Message Input */}
                            {selectedLead.status !== "CONVERTED" && (
                                <div className="p-4 border-t border-border bg-bg-secondary">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="text"
                                            placeholder="Type a message\u2026"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                                            className="input flex-1"
                                            aria-label="Message to lead"
                                            name="message"
                                            autoComplete="off"
                                        />
                                        <button
                                            onClick={handleSendMessage}
                                            disabled={!newMessage.trim() || sending}
                                            className="btn-primary !px-4"
                                            aria-label="Send message"
                                        >
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                            <div className="w-16 h-16 rounded-2xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center mb-4">
                                <UserPlus className="w-8 h-8 text-brand-green" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2 text-balance">
                                Select a lead
                            </h3>
                            <p className="text-text-secondary text-sm max-w-xs text-pretty">
                                Choose a lead from the list to view messages and respond.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
