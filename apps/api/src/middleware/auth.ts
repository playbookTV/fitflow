import { createClient } from "@supabase/supabase-js";
import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import posthog from "../lib/posthog";

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email?: string;
    };
}

// In-memory cache of coach IDs with timestamps for TTL-based re-verification.
// Avoids a findUnique query on every single authenticated request, while
// ensuring deleted coaches are detected within the TTL window.
const knownCoachIds = new Map<string, number>();
const COACH_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** @internal Exposed for tests only — clears the in-memory coach cache. */
export const _resetCoachCache = () => knownCoachIds.clear();

export const authenticate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing or invalid token" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const {
            data: { user },
            error,
        } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: "Invalid token" });
        }

        req.user = {
            id: user.id,
            email: user.email,
        };

        // Ensure coach record exists (creates on first authenticated request).
        // Re-verify against DB when cache entry is missing or expired.
        const cachedAt = knownCoachIds.get(user.id);
        const cacheValid = cachedAt != null && (Date.now() - cachedAt < COACH_CACHE_TTL_MS);
        if (!cacheValid && user.email) {
            try {
                const existing = await prisma.coach.findUnique({ where: { id: user.id } });
                if (existing) {
                    knownCoachIds.set(user.id, Date.now());
                } else if (cachedAt != null) {
                    // Coach was previously cached but no longer exists in DB — deleted
                    knownCoachIds.delete(user.id);
                    return res.status(403).json({ error: "Coach account not found" });
                } else {
                    console.log(`[Auth] Creating coach for ${user.id}`);
                    const fullName = user.user_metadata?.full_name as string | undefined;
                    const baseSlug = (fullName || user.email!.split("@")[0])
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-|-$/g, "");

                    // Append random suffix to guarantee uniqueness
                    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

                    // TODO: Allow coach to set currency via settings endpoint
                    const billingCurrency = "usd";

                    await prisma.coach.create({
                        data: {
                            id: user.id,
                            email: user.email,
                            name: fullName || null,
                            slug,
                            billingCurrency,
                        },
                    });
                    knownCoachIds.set(user.id, Date.now());

                    posthog.identify({
                        distinctId: user.id,
                        properties: {
                            email: user.email,
                            name: fullName || null,
                        },
                    });
                    posthog.capture({
                        distinctId: user.id,
                        event: "coach signed up",
                        properties: {
                            email: user.email,
                        },
                    });
                }
            } catch (upsertErr: any) {
                // P2002 = unique constraint race — another concurrent request already created the coach
                if (upsertErr?.code === "P2002") {
                    knownCoachIds.set(user.id, Date.now());
                } else {
                    console.error("[Auth] Coach ensure failed:", upsertErr);
                }
            }
        }

        next();
    } catch (error) {
        res.status(401).json({ error: "Authentication failed" });
    }
};
