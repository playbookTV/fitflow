"use client";

import { MoreHorizontal, MessageCircle, ArrowUpRight, Plus, MessageSquare, Send } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui";

interface Client {
    id: string;
    name: string;
    status: string;
    phone: string | null;
    email?: string;
    goals?: string;
    preferredChannel?: "WHATSAPP" | "TELEGRAM";
    telegramChatId?: string | null;
}

const ChannelBadge = ({ channel }: { channel?: "WHATSAPP" | "TELEGRAM" }) => {
    if (channel === "TELEGRAM") {
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-brand-blue bg-brand-blue/10 px-2 py-0.5 rounded-md border border-brand-blue/20">
                <Send className="w-2.5 h-2.5" aria-hidden="true" />
                TG
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-brand-green bg-brand-green/10 px-2 py-0.5 rounded-md border border-brand-green/20">
            <MessageSquare className="w-2.5 h-2.5" aria-hidden="true" />
            WA
        </span>
    );
};

const avatarGradients = [
    "from-brand-blue to-brand-violet",
    "from-brand-green to-brand-cyan",
    "from-brand-violet to-brand-red",
    "from-brand-orange to-brand-red",
    "from-brand-cyan to-brand-blue",
];

const getAvatarGradient = (name: string) => {
    const codePoint = name.codePointAt(0) || 0;
    const index = codePoint % avatarGradients.length;
    return avatarGradients[index];
};

export const ClientCard = ({ client }: { client: Client }) => {
    const gradient = getAvatarGradient(client.name);

    return (
        <Link
            href={`/dashboard/clients/${client.id}`}
            className="card-interactive block p-5 group relative overflow-hidden"
        >
            {/* Subtle glow on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-green/5 rounded-full blur-3xl" />
            </div>

            <div className="relative">
                <div className="flex justify-between items-start mb-4">
                    <div className={cn(
                        "avatar-md bg-gradient-to-br text-white shadow-inner",
                        gradient
                    )}>
                        {Array.from(client.name)[0]}
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                            onClick={(e) => e.preventDefault()}
                            className="btn-icon-sm"
                            aria-label={`Message ${client.name}`}
                        >
                            <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <button
                            onClick={(e) => e.preventDefault()}
                            className="btn-icon-sm"
                            aria-label="More options"
                        >
                            <MoreHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                    </div>
                </div>

                <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-brand-green transition-colors">
                    {client.name}
                </h3>
                <p className="text-sm text-text-faint mb-4 line-clamp-1 font-mono">
                    {client.phone || client.telegramChatId || "No contact"}
                </p>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <StatusBadge status={client.status} />
                        <ChannelBadge channel={client.preferredChannel} />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-text-muted group-hover:text-brand-green transition-[color,transform] duration-200 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                </div>
            </div>
        </Link>
    );
};

const gridVariants = {
    hidden: {},
    visible: {
        transition: { staggerChildren: 0.06 },
    },
};

const cardVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
};

export const ClientGrid = ({ clients }: { clients: Client[] }) => {
    return (
        <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            variants={gridVariants}
            initial="hidden"
            animate="visible"
        >
            {clients.map((client) => (
                <motion.div key={client.id} variants={cardVariants}>
                    <ClientCard client={client} />
                </motion.div>
            ))}

            {/* Add Client Card */}
            <motion.div variants={cardVariants}>
                <Link
                    href="/dashboard/clients/new"
                    className="flex flex-col items-center justify-center p-5 rounded-2xl border border-dashed border-border-hover bg-transparent hover:bg-bg-hover hover:border-brand-green/30 transition-[color,background-color,border-color,box-shadow,transform] duration-200 group min-h-[180px] h-full"
                >
                    <div className="w-12 h-12 rounded-xl bg-bg-card border border-border flex items-center justify-center text-text-faint mb-3 group-hover:border-brand-green/30 group-hover:text-brand-green group-hover:scale-110 transition-[color,border-color,transform] duration-200">
                        <Plus className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <p className="text-sm font-medium text-text-faint group-hover:text-text-secondary transition-colors">
                        Add New Client
                    </p>
                </Link>
            </motion.div>
        </motion.div>
    );
};
