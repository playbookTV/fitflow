import Link from "next/link";
import { UserX } from "lucide-react";

export default function ProfileNotFound() {
    return (
        <div className="relative min-h-dvh bg-bg-primary text-white flex items-center justify-center p-4 overflow-hidden">
            {/* Ambient background orbs */}
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                <div className="absolute -top-40 -right-40 h-[400px] w-[400px] rounded-full bg-brand-green/[0.03] blur-[120px]" />
                <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-brand-violet/[0.04] blur-[120px]" />
            </div>

            <div className="relative text-center max-w-sm animate-fade-in">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6">
                    <UserX className="w-7 h-7 text-text-faint" />
                </div>
                <h1 className="text-xl font-bold mb-2 text-balance">Profile not found</h1>
                <p className="text-sm text-text-secondary mb-8 text-pretty">
                    This coach profile doesn&apos;t exist or is no longer available.
                </p>
                <Link
                    href="https://fitflow.app"
                    className="btn-secondary"
                >
                    Go to FitFlow
                </Link>
                <p className="mt-12 text-[10px] text-text-faint font-mono uppercase tracking-widest">
                    Powered by FitFlow
                </p>
            </div>
        </div>
    );
}
