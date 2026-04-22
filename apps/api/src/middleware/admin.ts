import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { env } from "../lib/env";

const platformAdminIds = new Set(
    env.PLATFORM_ADMIN_IDS
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
);

export const requirePlatformAdmin = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    if (!req.user?.id || !platformAdminIds.has(req.user.id)) {
        return res.status(403).json({ error: "Forbidden" });
    }
    next();
};
