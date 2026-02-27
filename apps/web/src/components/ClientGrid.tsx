"use client";

import { MoreHorizontal, MessageCircle, ArrowUpRight, Plus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui";

interface Client {
    id: string;
    name: string;
    status: string;
    phone: string;
    email?: string;
    goals?: string;
}

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
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={(e) => e.preventDefault()}
                            className="btn-icon !p-2 !rounded-lg"
                        >
                            <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={(e) => e.preventDefault()}
                            className="btn-icon !p-2 !rounded-lg"
                        >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-brand-green transition-colors">
                    {client.name}
                </h3>
                <p className="text-sm text-text-faint mb-4 line-clamp-1 font-mono">
                    {client.phone}
                </p>

                <div className="flex items-center justify-between">
                    <StatusBadge status={client.status} />
                    <ArrowUpRight className="w-4 h-4 text-text-muted group-hover:text-brand-green transition-all transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
            </div>
        </Link>
    );
};

export const ClientGrid = ({ clients }: { clients: Client[] }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {clients.map((client) => (
                <ClientCard key={client.id} client={client} />
            ))}

            {/* Add Client Card */}
            <Link
                href="/dashboard/clients/new"
                className="flex flex-col items-center justify-center p-5 rounded-2xl border border-dashed border-border-hover bg-transparent hover:bg-bg-hover hover:border-brand-green/30 transition-all group min-h-[180px]"
            >
                <div className="w-12 h-12 rounded-xl bg-bg-card border border-border flex items-center justify-center text-text-faint mb-3 group-hover:border-brand-green/30 group-hover:text-brand-green group-hover:scale-110 transition-all">
                    <Plus className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium text-text-faint group-hover:text-text-secondary transition-colors">
                    Add New Client
                </p>
            </Link>
        </div>
    );
};
