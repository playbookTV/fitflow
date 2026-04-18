"use client";

export function SkipNav() {
    return (
        <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-brand-green focus:text-black focus:font-mono focus:text-xs focus:font-bold focus:tracking-wider focus:shadow-glow"
        >
            Skip to Main Content
        </a>
    );
}
