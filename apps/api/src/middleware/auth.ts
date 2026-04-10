import { createClient } from "@supabase/supabase-js";
import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

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

        // Ensure coach record exists (creates on first authenticated request)
        try {
            console.log(`[Auth] Ensuring coach for ${user.id}, email=${user.email}, name=${user.user_metadata?.full_name}`);
            if (user.email) {
                const fullName = user.user_metadata?.full_name as string | undefined;
                const baseSlug = (fullName || user.email!.split("@")[0])
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, "");

                let slug = baseSlug;
                const taken = await prisma.coach.findFirst({
                    where: { slug, id: { not: user.id } },
                });
                if (taken) {
                    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
                }

                await prisma.coach.upsert({
                    where: { id: user.id },
                    update: {},
                    create: {
                        id: user.id,
                        email: user.email,
                        name: fullName || null,
                        slug,
                    },
                });
            }
        } catch (upsertErr: any) {
            // P2002 = unique constraint race condition — another request already created the coach
            if (upsertErr?.code !== "P2002") {
                console.error("[Auth] Coach ensure failed:", upsertErr);
            }
        }

        next();
    } catch (error) {
        res.status(401).json({ error: "Authentication failed" });
    }
};
