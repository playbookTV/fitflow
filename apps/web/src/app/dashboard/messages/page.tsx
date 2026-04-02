"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
    Search,
    Send,
    MessageSquare,
    CheckCheck,
    Paperclip,
    Image as ImageIcon,
    MoreVertical,
    Phone,
} from "lucide-react";
import { cn, formatRelative } from "@/lib/utils";

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

export default function MessagesPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [newMessage, setNewMessage] = useState("");

    useEffect(() => {
        const fetchConversations = async () => {
            try {
                const token = localStorage.getItem("token");
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/messages/conversations`,
                    { headers: { Authorization: `Bearer ${token}` } }
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
        };
        fetchConversations();
    }, []);

    const filteredConversations = conversations.filter((conv) =>
        conv.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.clientPhone.includes(searchQuery)
    );

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedConversation) return;

        const message: Message = {
            id: `temp-${Date.now()}`,
            content: newMessage,
            direction: "outbound",
            status: "sent",
            createdAt: new Date().toISOString(),
        };

        setSelectedConversation((prev) =>
            prev ? { ...prev, messages: [...prev.messages, message] } : null
        );
        setNewMessage("");

        // API call would go here
    };

    const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

    return (
        <DashboardLayout
            title="Messages"
            subtitle="Conversations with clients across all channels"
            notifications={totalUnread}
        >
            <div className="flex h-[calc(100vh-180px)] rounded-2xl overflow-hidden border border-border bg-bg-card">
                {/* Conversations List */}
                <div className={cn(
                    "w-full md:w-80 lg:w-96 border-r border-border flex flex-col bg-bg-primary",
                    selectedConversation && "hidden md:flex"
                )}>
                    {/* Search Header */}
                    <div className="p-4 border-b border-border">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
                            <input
                                type="text"
                                placeholder="Search conversations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input-with-icon w-full"
                            />
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
                            filteredConversations.map((conv) => (
                                <button
                                    key={conv.id}
                                    onClick={() => setSelectedConversation(conv)}
                                    className={cn(
                                        "w-full p-4 flex items-start gap-3 hover:bg-bg-hover transition-colors text-left border-b border-border/50",
                                        selectedConversation?.id === conv.id && "bg-bg-hover"
                                    )}
                                >
                                    <div className={cn(
                                        "w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm shrink-0",
                                        getAvatarGradient(conv.clientName)
                                    )}>
                                        {conv.clientName.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-medium text-white text-sm truncate flex items-center gap-1.5">
                                                {conv.clientName}
                                                <span className={cn(
                                                    "text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0",
                                                    conv.channel === "TELEGRAM"
                                                        ? "text-brand-blue bg-brand-blue/10"
                                                        : "text-brand-green bg-brand-green/10"
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
                                            <p className="text-xs text-text-faint truncate pr-2">
                                                {conv.lastMessage}
                                            </p>
                                            {conv.unreadCount > 0 && (
                                                <span className="w-5 h-5 rounded-full bg-brand-green text-[10px] font-bold flex items-center justify-center text-white shrink-0">
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
                    "flex-1 flex flex-col",
                    !selectedConversation && "hidden md:flex"
                )}>
                    {selectedConversation ? (
                        <>
                            {/* Chat Header */}
                            <div className="h-16 px-4 border-b border-border flex items-center justify-between bg-bg-secondary">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setSelectedConversation(null)}
                                        className="md:hidden p-2 -ml-2 text-text-faint hover:text-white"
                                    >
                                        ←
                                    </button>
                                    <div className={cn(
                                        "w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm",
                                        getAvatarGradient(selectedConversation.clientName)
                                    )}>
                                        {selectedConversation.clientName.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-medium text-white text-sm flex items-center gap-2">
                                            {selectedConversation.clientName}
                                            <span className={cn(
                                                "text-[9px] font-bold px-1.5 py-0.5 rounded",
                                                selectedConversation.channel === "TELEGRAM"
                                                    ? "text-brand-blue bg-brand-blue/10"
                                                    : "text-brand-green bg-brand-green/10"
                                            )}>
                                                {selectedConversation.channel === "TELEGRAM" ? "Telegram" : "WhatsApp"}
                                            </span>
                                        </p>
                                        <p className="text-[10px] text-text-faint font-mono">
                                            {selectedConversation.clientPhone}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button className="btn-icon !p-2">
                                        <Phone className="w-4 h-4" />
                                    </button>
                                    <button className="btn-icon !p-2">
                                        <MoreVertical className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-bg-primary/50">
                                {selectedConversation.messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={cn(
                                            "flex",
                                            msg.direction === "outbound" ? "justify-end" : "justify-start"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "max-w-[75%] rounded-2xl px-4 py-2.5",
                                                msg.direction === "outbound"
                                                    ? "bg-brand-green text-white rounded-br-md"
                                                    : "bg-bg-card text-white rounded-bl-md border border-border"
                                            )}
                                        >
                                            <p className="text-sm">{msg.content}</p>
                                            <div className={cn(
                                                "flex items-center justify-end gap-1 mt-1",
                                                msg.direction === "outbound" ? "text-white/60" : "text-text-faint"
                                            )}>
                                                <span className="text-[10px]">
                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                </span>
                                                {msg.direction === "outbound" && (
                                                    <CheckCheck className={cn(
                                                        "w-3.5 h-3.5",
                                                        msg.status === "read" && "text-brand-blue"
                                                    )} />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Message Input */}
                            <div className="p-4 border-t border-border bg-bg-secondary">
                                <div className="flex items-center gap-3">
                                    <button className="btn-icon !p-2">
                                        <Paperclip className="w-4 h-4" />
                                    </button>
                                    <button className="btn-icon !p-2">
                                        <ImageIcon className="w-4 h-4" />
                                    </button>
                                    <input
                                        type="text"
                                        placeholder="Type a message..."
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                                        className="input flex-1"
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={!newMessage.trim()}
                                        className="btn-primary !px-4"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                            <div className="w-16 h-16 rounded-2xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center mb-4">
                                <MessageSquare className="w-8 h-8 text-brand-green" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">
                                Select a conversation
                            </h3>
                            <p className="text-text-secondary text-sm max-w-xs">
                                Choose a client from the list to view and send messages.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
