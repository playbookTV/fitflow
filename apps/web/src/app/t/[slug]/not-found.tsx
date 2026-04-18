import Link from "next/link";

export default function ProfileNotFound() {
    return (
        <div className="min-h-dvh bg-bg-primary text-white flex items-center justify-center p-4">
            <div className="text-center max-w-sm">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6">
                    <span className="text-3xl text-text-faint">?</span>
                </div>
                <h1 className="text-xl font-bold mb-2">Profile not found</h1>
                <p className="text-sm text-text-secondary mb-8">
                    This trainer profile doesn&apos;t exist or is no longer available.
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
