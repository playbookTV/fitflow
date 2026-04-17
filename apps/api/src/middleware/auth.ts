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
            console.log(`[Auth] Ensuring coach for ${user.id}`);
            if (user.email) {
                const existing = await prisma.coach.findUnique({ where: { id: user.id } });
                if (!existing) {
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
                }
            }
        } catch (upsertErr: any) {
            // P2002 = unique constraint race — another concurrent request already created the coach
            if (upsertErr?.code !== "P2002") {
                console.error("[Auth] Coach ensure failed:", upsertErr);
            }
        }

        next();
    } catch (error) {
        res.status(401).json({ error: "Authentication failed" });
    }
};
