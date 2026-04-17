"use client";

import { useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface AvatarUploadProps {
    currentUrl: string | null;
    name: string;
    onUploaded: (url: string | null) => void;
}

function getInitials(name: string): string {
    return name
        .split(" ")
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase();
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function AvatarUpload({ currentUrl, name, onUploaded }: AvatarUploadProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleClick = () => {
        if (!uploading) {
            fileInputRef.current?.click();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset input so the same file can be re-selected
        e.target.value = "";

        if (!ACCEPTED_TYPES.includes(file.type)) {
            setError("Use a JPEG, PNG, or WebP image");
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            setError("Image must be under 2 MB");
            return;
        }

        setError(null);
        setUploading(true);

        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const ext = file.name.split(".").pop() || "jpg";
            const path = `${user.id}/avatar-${Date.now()}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(path, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from("avatars")
                .getPublicUrl(path);

            onUploaded(publicUrl);
        } catch (err) {
            console.error("Avatar upload failed:", err);
            setError("Upload failed — try again");
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        onUploaded(null);
        setError(null);
    };

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative group">
                {/* Avatar circle */}
                <button
                    type="button"
                    onClick={handleClick}
                    className={cn(
                        "relative w-24 h-24 rounded-full overflow-hidden border-2 border-white/10",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary",
                        "transition-all",
                        !uploading && "cursor-pointer hover:border-white/20"
                    )}
                >
                    {currentUrl ? (
                        <img
                            src={currentUrl}
                            alt={name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-brand-green to-brand-cyan flex items-center justify-center text-2xl font-bold text-black">
                            {getInitials(name || "?")}
                        </div>
                    )}

                    {/* Hover overlay */}
                    {!uploading && (
                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="w-5 h-5 text-white" />
                            <span className="text-[10px] font-medium text-white mt-1 tracking-wide uppercase">
                                {currentUrl ? "Change" : "Upload"}
                            </span>
                        </div>
                    )}

                    {/* Upload spinner overlay */}
                    {uploading && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        </div>
                    )}
                </button>

                {/* Remove button */}
                {currentUrl && !uploading && (
                    <button
                        type="button"
                        onClick={handleRemove}
                        className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-bg-secondary border border-border-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-brand-red/20 hover:border-brand-red/40"
                    >
                        <X className="w-3 h-3 text-text-secondary" />
                    </button>
                )}
            </div>

            {/* Error message */}
            {error && (
                <p className="text-xs text-brand-red text-center">{error}</p>
            )}

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
            />
        </div>
    );
}
