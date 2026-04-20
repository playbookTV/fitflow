export default function ProfileLoading() {
    return (
        <div className="relative min-h-dvh bg-bg-primary text-white overflow-hidden">
            {/* Ambient background orbs — match ProfilePage */}
            <div className="pointer-events-none fixed inset-0" aria-hidden="true">
                <div className="absolute top-[-15%] left-[-10%] w-[40%] h-[40%] bg-brand-green/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-15%] right-[-10%] w-[40%] h-[40%] bg-brand-cyan/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative flex flex-col items-center px-4 py-12 max-w-md mx-auto">
                {/* Avatar skeleton */}
                <div className="w-24 h-24 rounded-full skeleton mb-5" />

                {/* Name skeleton */}
                <div className="h-7 w-48 skeleton rounded-lg mb-2" />

                {/* Specialities skeleton */}
                <div className="h-4 w-40 skeleton rounded-lg mb-3" />

                {/* URL skeleton */}
                <div className="h-3 w-36 skeleton rounded-lg mb-6" />

                {/* Bio skeleton */}
                <div className="space-y-2 w-full max-w-sm">
                    <div className="h-4 w-full skeleton rounded-lg" />
                    <div className="h-4 w-3/4 skeleton rounded-lg mx-auto" />
                </div>

                {/* Button skeletons */}
                <div className="mt-8 w-full space-y-3">
                    <div className="h-12 w-full skeleton rounded-xl" />
                    <div className="h-12 w-full skeleton rounded-xl" />
                </div>
            </div>
        </div>
    );
}
