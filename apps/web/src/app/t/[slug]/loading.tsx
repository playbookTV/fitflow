export default function ProfileLoading() {
    return (
        <div className="min-h-screen bg-bg-primary text-white">
            <div className="flex flex-col items-center px-4 py-12 max-w-md mx-auto animate-pulse">
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
