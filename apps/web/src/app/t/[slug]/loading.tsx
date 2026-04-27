export default function ProfileLoading() {
    return (
        <div className="min-h-[100dvh] bg-bg-primary text-white overflow-hidden">
            {/* Ambient background orbs */}
            <div className="pointer-events-none fixed inset-0" aria-hidden="true">
                <div className="absolute top-[-20%] left-[-15%] w-[50%] h-[50%] bg-brand-green/[0.04] rounded-full blur-[160px]" />
                <div className="absolute top-[30%] right-[-20%] w-[40%] h-[40%] bg-brand-cyan/[0.03] rounded-full blur-[140px]" />
                <div className="absolute bottom-[-15%] left-[20%] w-[35%] h-[35%] bg-brand-violet/[0.03] rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 mx-auto max-w-5xl px-5 py-12 md:py-24 md:grid md:grid-cols-[380px_1fr] md:gap-16">
                {/* ── Left column skeleton ── */}
                <div className="space-y-5">
                    {/* Avatar double-bezel skeleton */}
                    <div
                        className="double-bezel w-fit animate-fade-in"
                        style={{ animationDelay: "0ms", animationFillMode: "both" }}
                    >
                        <div className="double-bezel-inner p-1">
                            <div className="w-28 h-28 md:w-32 md:h-32 rounded-2xl skeleton" />
                        </div>
                    </div>

                    {/* Business name */}
                    <div
                        className="h-3 w-24 skeleton rounded-full animate-fade-in"
                        style={{ animationDelay: "50ms", animationFillMode: "both" }}
                    />

                    {/* Name */}
                    <div
                        className="h-10 w-56 skeleton rounded-lg animate-fade-in"
                        style={{ animationDelay: "100ms", animationFillMode: "both" }}
                    />

                    {/* Speciality badges */}
                    <div
                        className="flex gap-2 animate-fade-in"
                        style={{ animationDelay: "150ms", animationFillMode: "both" }}
                    >
                        <div className="h-6 w-20 skeleton rounded-full" />
                        <div className="h-6 w-24 skeleton rounded-full" />
                        <div className="h-6 w-16 skeleton rounded-full" />
                    </div>

                    {/* Bio */}
                    <div
                        className="space-y-2 animate-fade-in"
                        style={{ animationDelay: "200ms", animationFillMode: "both" }}
                    >
                        <div className="h-4 w-full skeleton rounded-lg" />
                        <div className="h-4 w-4/5 skeleton rounded-lg" />
                        <div className="h-4 w-3/5 skeleton rounded-lg" />
                    </div>

                    {/* URL */}
                    <div
                        className="h-3 w-32 skeleton rounded animate-fade-in"
                        style={{ animationDelay: "250ms", animationFillMode: "both" }}
                    />
                </div>

                {/* ── Right column skeleton ── */}
                <div className="mt-12 md:mt-0 space-y-12">
                    {/* Rates section */}
                    <div
                        className="animate-fade-in"
                        style={{ animationDelay: "300ms", animationFillMode: "both" }}
                    >
                        <div className="h-3 w-12 skeleton rounded mb-5" />
                        <div className="double-bezel">
                            <div className="double-bezel-inner p-6 space-y-4">
                                <div className="h-5 w-12 skeleton rounded-full" />
                                <div className="flex items-baseline justify-between">
                                    <div className="h-3 w-20 skeleton rounded" />
                                    <div className="h-8 w-24 skeleton rounded-lg" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CTA buttons */}
                    <div
                        className="space-y-4 animate-fade-in"
                        style={{ animationDelay: "400ms", animationFillMode: "both" }}
                    >
                        <div className="h-3 w-24 skeleton rounded mb-5" />
                        <div className="h-14 w-full skeleton rounded-2xl" />
                        <div className="h-14 w-full skeleton rounded-2xl" />
                    </div>

                    {/* Offers */}
                    <div
                        className="space-y-3 animate-fade-in"
                        style={{ animationDelay: "500ms", animationFillMode: "both" }}
                    >
                        <div className="h-3 w-14 skeleton rounded mb-5" />
                        <div className="double-bezel">
                            <div className="double-bezel-inner p-5">
                                <div className="h-5 w-48 skeleton rounded" />
                            </div>
                        </div>
                        <div className="double-bezel">
                            <div className="double-bezel-inner p-5">
                                <div className="h-5 w-40 skeleton rounded" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
