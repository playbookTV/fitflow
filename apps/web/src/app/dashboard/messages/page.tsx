"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { getAuthHeaders } from "@/lib/auth";
import {
    Search,
    Send,
    MessageSquare,
    CheckCheck,
    // Paperclip,
    // Image as ImageIcon,
    MoreVertical,
    Archive,
    Pin,
    Trash2,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter, ModalClose } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { WhatsAppWindowBanner } from "@/components/WhatsAppWindowBanner";
import { cn, formatRelative } from "@/lib/utils";
import { formatTime, formatDateSeparator } from "@/lib/tokens";

interface Message {
    id: string;
    content: string;
    direction: "inbound" | "outbound";
    status: "sent" | "delivered" | "read" | "failed";
    createdAt: string;
}

interface Conversation {
    id: string;
    clientId: string;
    clientName: string;
    clientPhone: string;
    channel: "WHATSAPP" | "TELEGRAM";
    pinned?: boolean;
    lastMessage?: string;
    lastMessageAt?: string;
    unreadCount: number;
    messages: Message[];
}

// Mock data for development
const MOCK_CONVERSATIONS: Conversation[] = [
    {
        id: "1",
        clientId: "c1",
        clientName: "Alex Rivera",
        clientPhone: "+44 7700 900123",
        lastMessage: "Thanks coach! I'll do my best tomorrow.",
        lastMessageAt: "2024-03-21T14:30:00Z",
        channel: "WHATSAPP",
        unreadCount: 2,
        messages: [
            { id: "m1", content: "Hey Alex! Don't forget your workout tomorrow - Leg Day 💪", direction: "outbound", status: "read", createdAt: "2024-03-21T10:00:00Z" },
            { id: "m2", content: "Thanks coach! I'll do my best tomorrow.", direction: "inbound", status: "read", createdAt: "2024-03-21T14:30:00Z" },
        ],
    },
    {
        id: "2",
        clientId: "c2",
        clientName: "Sarah Chen",
        clientPhone: "+44 7700 900456",
        lastMessage: "Your payment link: https://pay.fitflow.com/...",
        lastMessageAt: "2024-03-20T09:15:00Z",
        channel: "TELEGRAM",
        unreadCount: 0,
        messages: [
            { id: "m3", content: "Your payment link: https://pay.fitflow.com/...", direction: "outbound", status: "delivered", createdAt: "2024-03-20T09:15:00Z" },
        ],
    },
    {
        id: "3",
        clientId: "c3",
        clientName: "Marcus Thorne",
        clientPhone: "+44 7700 900789",
        lastMessage: "Can we adjust my workout schedule?",
        lastMessageAt: "2024-03-19T16:45:00Z",
        channel: "WHATSAPP",
        unreadCount: 1,
        messages: [
            { id: "m4", content: "Can we adjust my workout schedule?", direction: "inbound", status: "read", createdAt: "2024-03-19T16:45:00Z" },
        ],
    },
];

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

function shouldGroupWithPrevious(messages: Message[], index: number): boolean {
    if (index === 0) return false;
    const prev = messages[index - 1];
    const curr = messages[index];
    if (prev.direction !== curr.direction) return false;
    const gap = new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime();
    return gap < 5 * 60 * 1000;
}

function isLastInGroup(messages: Message[], index: number): boolean {
    if (index === messages.length - 1) return true;
    return !shouldGroupWithPrevious(messages, index + 1);
}

function isDifferentDay(a: string, b: string): boolean {
    const da = new Date(a);
    const db = new Date(b);
    return da.getFullYear() !== db.getFullYear() || da.getMonth() !== db.getMonth() || da.getDate() !== db.getDate();
}

export default function MessagesPage() {
    return (
        <Suspense>
            <MessagesPageContent />
        </Suspense>
    );
}

function MessagesPageContent() {
    const searchParams = useSearchParams();
    const preselectedClientId = searchParams.get("client");
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [newMessage, setNewMessage] = useState("");
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [canSendFreeText, setCanSendFreeText] = useState(true);
    const { toast } = useToast();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    }, []);

    const fetchConversations = useCallback(async () => {
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/messages/conversations`,
                { headers: await getAuthHeaders() }
            );
            if (response.ok) {
                setConversations(await response.json());
            } else {
                setConversations(MOCK_CONVERSATIONS);
            }
        } catch {
            setConversations(MOCK_CONVERSATIONS);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial load
    useEffect(() => { fetchConversations(); }, [fetchConversations]);

    // Auto-select conversation from query param
    useEffect(() => {
        if (preselectedClientId && conversations.length > 0 && !selectedConversation) {
            const match = conversations.find((c) => c.clientId === preselectedClientId);
            if (match) setSelectedConversation(match);
        }
    }, [preselectedClientId, conversations, selectedConversation]);

    // Poll conversation list every 15s for unread counts
    useEffect(() => {
        const interval = setInterval(fetchConversations, 15000);
        return () => clearInterval(interval);
    }, [fetchConversations]);

    // Poll active conversation every 5s for new messages
    const selectedClientIdRef = useRef<string | null>(null);
    useEffect(() => {
        selectedClientIdRef.current = selectedConversation?.clientId || null;
    }, [selectedConversation?.clientId]);

    const selectedClientId = selectedConversation?.clientId || null;
    useEffect(() => {
        if (!selectedClientId) return;
        const interval = setInterval(async () => {
            const clientId = selectedClientIdRef.current;
            if (!clientId) return;
            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/messages/${clientId}?limit=50`,
                    { headers: await getAuthHeaders() }
                );
                if (res.ok) {
                    const msgs = await res.json();
                    const formatted: Message[] = msgs.reverse().map((m: Record<string, string>) => ({
                        id: m.id,
                        content: m.content,
                        direction: m.direction === "INBOUND" ? "inbound" : "outbound",
                        status: m.status || "sent",
                        createdAt: m.createdAt,
                    }));
                    setSelectedConversation((prev) =>
                        prev && prev.clientId === clientId
                            ? { ...prev, messages: formatted }
                            : prev
                    );
                }
            } catch { /* silent */ }
        }, 5000);
        return () => clearInterval(interval);
    }, [selectedClientId]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (selectedConversation?.messages.length) {
            scrollToBottom();
        }
    }, [selectedConversation?.messages.length, scrollToBottom]);

    // Instant scroll when switching conversations
    useEffect(() => {
        if (selectedConversation) {
            setTimeout(() => scrollToBottom("instant"), 0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedConversation?.id]);

    const filteredConversations = conversations.filter((conv) =>
        conv.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.clientPhone.includes(searchQuery)
    );

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedConversation) return;

        const tempId = `temp-${Date.now()}`;
        const content = newMessage;
        setNewMessage("");

        // Optimistic update
        const optimistic: Message = {
            id: tempId,
            content,
            direction: "outbound",
            status: "sent",
            createdAt: new Date().toISOString(),
        };

        setSelectedConversation((prev) =>
            prev ? { ...prev, messages: [...prev.messages, optimistic] } : null
        );

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/messages/${selectedConversation.clientId}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(await getAuthHeaders()),
                    },
                    body: JSON.stringify({ content }),
                }
            );

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                const errorMsg = errorData.error || "Failed to send message";
                throw new Error(errorMsg);
            }

            const saved = await res.json();

            // Replace optimistic message with the real one
            setSelectedConversation((prev) =>
                prev
                    ? {
                          ...prev,
                          messages: prev.messages.map((m) =>
                              m.id === tempId ? { ...saved } : m
                          ),
                      }
                    : null
            );

            // Update conversation list with latest message
            setConversations((prev) =>
                prev.map((c) =>
                    c.clientId === selectedConversation.clientId
                        ? { ...c, lastMessage: content, lastMessageAt: saved.createdAt }
                        : c
                )
            );
        } catch (err) {
            // Mark as failed
            setSelectedConversation((prev) =>
                prev
                    ? {
                          ...prev,
                          messages: prev.messages.map((m) =>
                              m.id === tempId ? { ...m, status: "failed" as const } : m
                          ),
                      }
                    : null
            );

            const message = err instanceof Error ? err.message : "Failed to send message";
            let title = "Message not sent";
            let description = message;

            if (message.toLowerCase().includes("24-hour") || message.toLowerCase().includes("window")) {
                title = "WhatsApp window closed";
                description = "This client's messaging window has closed. They need to send you a message first to reopen it.";
            } else if (message.toLowerCase().includes("rate limit")) {
                title = "Rate limit reached";
                description = "WhatsApp is temporarily limiting message volume. Try again in a few minutes.";
            } else if (message.toLowerCase().includes("not on whatsapp")) {
                title = "Number not on WhatsApp";
                description = "This phone number is not registered on WhatsApp.";
            }

            toast({ variant: "warning", title, description });
        }
    };

    const handleArchiveConversation = async () => {
        if (!selectedConversation) return;
        const clientId = selectedConversation.clientId;
        try {
            await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/messages/${clientId}/archive`,
                { method: "PATCH", headers: await getAuthHeaders() }
            );
            setConversations((prev) => prev.filter((c) => c.clientId !== clientId));
            setSelectedConversation(null);
        } catch {
            console.error("Failed to archive conversation");
        }
    };

    const handlePinConversation = async () => {
        if (!selectedConversation) return;
        const clientId = selectedConversation.clientId;
        const wasPinned = selectedConversation.pinned;
        try {
            // Optimistic update
            setConversations((prev) => {
                const updated = prev.map((c) =>
                    c.clientId === clientId ? { ...c, pinned: !wasPinned } : c
                );
                return updated.sort((a, b) => {
                    if (a.pinned && !b.pinned) return -1;
                    if (!a.pinned && b.pinned) return 1;
                    return 0;
                });
            });
            setSelectedConversation((prev) =>
                prev ? { ...prev, pinned: !wasPinned } : null
            );

            await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/messages/${clientId}/pin`,
                { method: "PATCH", headers: await getAuthHeaders() }
            );
        } catch {
            // Revert on failure
            setConversations((prev) =>
                prev.map((c) =>
                    c.clientId === clientId ? { ...c, pinned: wasPinned } : c
                )
            );
            setSelectedConversation((prev) =>
                prev ? { ...prev, pinned: wasPinned } : null
            );
        }
    };

    const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

    return (
        <DashboardLayout
            title="Messages"
            subtitle="Conversations with clients across all channels"
            notifications={totalUnread}
        >
            <div className="flex h-[calc(100dvh-140px)] sm:h-[calc(100dvh-180px)] rounded-2xl overflow-hidden border border-border bg-bg-card">
                {/* Conversations List */}
                <div className={cn(
                    "w-full md:w-80 lg:w-96 border-r border-border flex flex-col bg-bg-primary",
                    selectedConversation && "hidden md:flex"
                )}>
                    {/* Search Header */}
                    <div className="p-4 border-b border-border">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search conversations\u2026"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="peer input-with-icon w-full"
                                aria-label="Search conversations"
                                name="search"
                                autoComplete="off"
                            />
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-faint transition-colors duration-200 peer-focus:text-brand-green pointer-events-none" />
                        </div>
                    </div>

                    {/* Conversation List */}
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="skeleton h-16 rounded-xl" />
                                ))}
                            </div>
                        ) : filteredConversations.length === 0 ? (
                            <div className="p-8 text-center">
                                <MessageSquare className="w-8 h-8 text-text-muted mx-auto mb-3" />
                                <p className="text-text-secondary text-sm">No conversations yet</p>
                            </div>
                        ) : (
                            filteredConversations.map((conv, index) => (
                                <button
                                    key={conv.id}
                                    onClick={() => { setSelectedConversation(conv); setCanSendFreeText(true); }}
                                    className={cn(
                                        "w-full p-4 flex items-start gap-3 hover:bg-bg-hover transition-[color,background-color,border-color,transform] duration-200 text-left border-b border-border/50 animate-fade-in active:scale-[0.98]",
                                        selectedConversation?.id === conv.id
                                            ? "bg-bg-hover border-l-2 border-l-brand-green"
                                            : "border-l-2 border-l-transparent"
                                    )}
                                    style={{ animationDelay: `${Math.min(index, 10) * 30}ms`, animationFillMode: "both" }}
                                >
                                    <div className="relative shrink-0">
                                        <div className={cn(
                                            "w-11 h-11 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm",
                                            getAvatarGradient(conv.clientName),
                                            selectedConversation?.id === conv.id && "ring-2 ring-brand-green/30"
                                        )}>
                                            {conv.clientName.charAt(0)}
                                        </div>
                                        {conv.pinned && (
                                            <Pin className="w-3 h-3 text-text-faint absolute -top-0.5 -right-0.5" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-medium text-white text-sm truncate flex items-center gap-1.5">
                                                {conv.clientName}
                                                <span className={cn(
                                                    "text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0",
                                                    conv.channel === "TELEGRAM"
                                                        ? "text-brand-blue bg-brand-blue/10 border border-brand-blue/20"
                                                        : "text-brand-green bg-brand-green/10 border border-brand-green/20"
                                                )}>
                                                    {conv.channel === "TELEGRAM" ? "TG" : "WA"}
                                                </span>
                                            </span>
                                            {conv.lastMessageAt && (
                                                <span className="text-[10px] text-text-faint">
                                                    {formatRelative(conv.lastMessageAt)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-text-secondary truncate pr-2">
                                                {conv.lastMessage}
                                            </p>
                                            {conv.unreadCount > 0 && (
                                                <span className="w-5 h-5 rounded-full bg-brand-green text-[10px] font-bold flex items-center justify-center text-white shrink-0 tabular-nums shadow-[0_0_8px_rgba(37,211,102,0.3)]">
                                                    {conv.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Chat View */}
                <div className={cn(
                    "flex-1 min-w-0 flex flex-col",
                    !selectedConversation && "hidden md:flex"
                )}>
                    {selectedConversation ? (
                        <>
                            {/* Chat Header */}
                            <div className="h-16 sm:h-[72px] px-4 border-b border-border/80 flex items-center justify-between bg-bg-secondary shadow-[0_1px_0_rgba(0,0,0,0.2)]">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setSelectedConversation(null)}
                                        className="md:hidden p-2 -ml-2 text-text-faint hover:text-white transition-colors"
                                        aria-label="Back to conversations"
                                    >
                                        ←
                                    </button>
                                    <div className="relative">
                                        <div className={cn(
                                            "w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm",
                                            getAvatarGradient(selectedConversation.clientName)
                                        )}>
                                            {selectedConversation.clientName.charAt(0)}
                                        </div>
                                        <div className="w-2.5 h-2.5 rounded-full bg-brand-green absolute -bottom-0.5 -right-0.5 ring-2 ring-bg-secondary" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-white text-sm flex items-center gap-2">
                                            {selectedConversation.clientName}
                                            <span className={cn(
                                                "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                                selectedConversation.channel === "TELEGRAM"
                                                    ? "text-brand-blue bg-brand-blue/10 border border-brand-blue/20"
                                                    : "text-brand-green bg-brand-green/10 border border-brand-green/20"
                                            )}>
                                                {selectedConversation.channel === "TELEGRAM" ? "Telegram" : "WhatsApp"}
                                            </span>
                                            {selectedConversation.channel === "WHATSAPP" && (
                                                <WhatsAppWindowBanner
                                                    clientId={selectedConversation.clientId}
                                                    channel={selectedConversation.channel}
                                                    compact
                                                />
                                            )}
                                        </p>
                                        <p className="text-[11px] text-text-faint font-mono">
                                            {selectedConversation.clientPhone}
                                        </p>
                                    </div>
                                </div>
                                <DropdownMenu.Root>
                                    <DropdownMenu.Trigger asChild>
                                        <button className="btn-icon !p-2" aria-label="More options">
                                            <MoreVertical className="w-4 h-4" />
                                        </button>
                                    </DropdownMenu.Trigger>
                                    <DropdownMenu.Portal>
                                        <DropdownMenu.Content
                                            align="end"
                                            sideOffset={8}
                                            className="min-w-[160px] bg-bg-card border border-border rounded-xl p-1 shadow-lg z-50 animate-in fade-in-0 zoom-in-95"
                                        >
                                            <DropdownMenu.Item
                                                className="flex items-center gap-2.5 px-3 py-2 text-sm text-white rounded-lg cursor-pointer outline-none hover:bg-white/5 transition-colors"
                                                onSelect={handleArchiveConversation}
                                            >
                                                <Archive className="w-4 h-4 text-text-faint" />
                                                Archive
                                            </DropdownMenu.Item>
                                            <DropdownMenu.Item
                                                className="flex items-center gap-2.5 px-3 py-2 text-sm text-white rounded-lg cursor-pointer outline-none hover:bg-white/5 transition-colors"
                                                onSelect={handlePinConversation}
                                            >
                                                <Pin className="w-4 h-4 text-text-faint" />
                                                {selectedConversation.pinned ? "Unpin" : "Pin"}
                                            </DropdownMenu.Item>
                                            <DropdownMenu.Separator className="h-px bg-border my-1" />
                                            <DropdownMenu.Item
                                                className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 rounded-lg cursor-pointer outline-none hover:bg-red-500/10 transition-colors"
                                                onSelect={() => setConfirmDelete(selectedConversation.clientId)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Delete
                                            </DropdownMenu.Item>
                                        </DropdownMenu.Content>
                                    </DropdownMenu.Portal>
                                </DropdownMenu.Root>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-1 chat-bg">
                                {selectedConversation.messages.map((msg, index) => {
                                    const msgs = selectedConversation.messages;
                                    const grouped = shouldGroupWithPrevious(msgs, index);
                                    const lastInGroup = isLastInGroup(msgs, index);
                                    const showDateSep = index === 0 || isDifferentDay(msgs[index - 1].createdAt, msg.createdAt);

                                    return (
                                        <div key={msg.id}>
                                            {showDateSep && (
                                                <div className="chat-date-separator">
                                                    <span>{formatDateSeparator(msg.createdAt)}</span>
                                                </div>
                                            )}
                                            <div
                                                className={cn(
                                                    "flex",
                                                    msg.direction === "outbound" ? "justify-end" : "justify-start",
                                                    !grouped && index > 0 && "mt-3",
                                                    msg.id.startsWith("temp-") && "animate-slide-up"
                                                )}
                                            >
                                                <div
                                                    className={cn(
                                                        "max-w-[75%] px-4 py-2.5",
                                                        msg.direction === "outbound"
                                                            ? cn(
                                                                "bg-gradient-to-br from-brand-green to-brand-green-muted text-white shadow-[0_1px_3px_rgba(0,0,0,0.3)]",
                                                                !grouped && lastInGroup && "rounded-2xl rounded-br-md",
                                                                !grouped && !lastInGroup && "rounded-2xl rounded-br-md",
                                                                grouped && lastInGroup && "rounded-2xl rounded-tr-md rounded-br-md",
                                                                grouped && !lastInGroup && "rounded-xl rounded-r-md",
                                                              )
                                                            : cn(
                                                                "bg-bg-card text-white border border-border shadow-[0_1px_2px_rgba(0,0,0,0.2)]",
                                                                !grouped && lastInGroup && "rounded-2xl rounded-bl-md",
                                                                !grouped && !lastInGroup && "rounded-2xl rounded-bl-md",
                                                                grouped && lastInGroup && "rounded-2xl rounded-tl-md rounded-bl-md",
                                                                grouped && !lastInGroup && "rounded-xl rounded-l-md",
                                                              ),
                                                        msg.status === "failed" && "!bg-brand-red/20 !border-brand-red/30"
                                                    )}
                                                    style={msg.direction === "inbound" ? {
                                                        backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)"
                                                    } : undefined}
                                                >
                                                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                                                    {lastInGroup && (
                                                        <div className={cn(
                                                            "flex items-center justify-end gap-1 mt-1",
                                                            msg.direction === "outbound" ? "text-white/70" : "text-text-faint"
                                                        )}>
                                                            <span className="text-[11px]">
                                                                {formatTime(msg.createdAt)}
                                                            </span>
                                                            {msg.direction === "outbound" && (
                                                                <CheckCheck className={cn(
                                                                    "w-3.5 h-3.5",
                                                                    msg.status === "read" && "text-brand-blue"
                                                                )} />
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* WhatsApp Window Status + Message Input */}
                            <div className="border-t border-border bg-bg-secondary">
                                {selectedConversation.channel === "WHATSAPP" && (
                                    <WhatsAppWindowBanner
                                        clientId={selectedConversation.clientId}
                                        channel={selectedConversation.channel}
                                        className="mx-4 mt-3"
                                        onWindowStatusChange={setCanSendFreeText}
                                    />
                                )}
                                <div className="p-3 sm:p-4">
                                    <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-2xl px-2 py-1.5">
                                        {/* TODO: Wire up when media upload API is ready
                                        <button className="btn-icon !p-2" aria-label="Attach file" disabled={!canSendFreeText && selectedConversation.channel === "WHATSAPP"}>
                                            <Paperclip className="w-4 h-4" />
                                        </button>
                                        <button className="btn-icon !p-2" aria-label="Attach image" disabled={!canSendFreeText && selectedConversation.channel === "WHATSAPP"}>
                                            <ImageIcon className="w-4 h-4" />
                                        </button>
                                        */}
                                        <input
                                            type="text"
                                            placeholder={!canSendFreeText && selectedConversation.channel === "WHATSAPP"
                                                ? "Window closed \u2014 only templates available"
                                                : "Type a message\u2026"}
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                                            className="flex-1 bg-transparent border-none text-sm text-white placeholder:text-text-faint py-2 px-3 focus:outline-none focus:ring-0"
                                            aria-label="Message input"
                                            name="message"
                                            autoComplete="off"
                                            disabled={!canSendFreeText && selectedConversation.channel === "WHATSAPP"}
                                        />
                                        <button
                                            onClick={handleSendMessage}
                                            disabled={!newMessage.trim() || (!canSendFreeText && selectedConversation.channel === "WHATSAPP")}
                                            className="p-2.5 rounded-xl bg-brand-green text-black hover:shadow-glow transition-[color,background-color,box-shadow,transform] duration-200 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
                                            aria-label="Send message"
                                        >
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="hidden sm:block text-[10px] text-text-muted text-right mt-1.5 px-2">
                                        Press Enter to send
                                    </p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[radial-gradient(ellipse_at_center,_rgba(37,211,102,0.05)_0%,_transparent_70%)]">
                            <div className="w-16 h-16 rounded-2xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center mb-4">
                                <MessageSquare className="w-8 h-8 text-brand-green" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2 text-balance">
                                Select a conversation
                            </h3>
                            <p className="text-text-secondary text-sm max-w-xs text-pretty">
                                Choose a client from the list to view and send messages.
                            </p>
                        </div>
                    )}
                </div>
            </div>
            <Modal open={!!confirmDelete} onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}>
                <ModalContent size="sm">
                    <ModalHeader>
                        <ModalTitle>Delete Conversation</ModalTitle>
                        <ModalClose />
                    </ModalHeader>
                    <div className="p-6">
                        <p className="text-text-secondary text-sm text-pretty">Are you sure you want to delete this conversation? This action cannot be undone.</p>
                    </div>
                    <ModalFooter>
                        <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
                        <button className="btn-primary !bg-brand-red hover:!shadow-glow-red" onClick={async () => {
                            if (!confirmDelete) return;
                            try {
                                await fetch(
                                    `${process.env.NEXT_PUBLIC_API_URL}/messages/${confirmDelete}`,
                                    { method: "DELETE", headers: await getAuthHeaders() }
                                );
                                setConversations((prev) => prev.filter((c) => c.clientId !== confirmDelete));
                                if (selectedConversation?.clientId === confirmDelete) {
                                    setSelectedConversation(null);
                                }
                            } catch {
                                console.error("Failed to delete conversation");
                            } finally {
                                setConfirmDelete(null);
                            }
                        }}>Delete</button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </DashboardLayout>
    );
}
