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
        await prisma.coach.upsert({
            where: { id: user.id },
            update: {},
            create: { id: user.id, email: user.email! },
        });

        next();
    } catch (error) {
        res.status(401).json({ error: "Authentication failed" });
    }
};
