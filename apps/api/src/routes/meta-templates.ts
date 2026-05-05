import { Router, Response } from "express";
import axios from "axios";
import { TemplateId } from "@fitflow/shared";
import { authenticate, AuthRequest } from "../middleware/auth";
import { env } from "../lib/env";
import { META_TEMPLATES, buildCreatePayload } from "../lib/templates/meta-templates";

const router: Router = Router();

const WA_ACCESS_TOKEN = env.META_WHATSAPP_ACCESS_TOKEN;
const WA_BUSINESS_ACCOUNT_ID = env.META_WHATSAPP_BUSINESS_ACCOUNT_ID;
const VERSION = "v22.0";

// ═══════════════════════════════════════════════════════════════
// META MESSAGE TEMPLATE MANAGEMENT
// ══════════���═════��═════════════════════════════════════���════════

/**
 * GET /meta-templates
 * List all message templates registered with Meta for this WABA.
 */
router.get("/", authenticate, async (_req: AuthRequest, res: Response) => {
    if (!WA_ACCESS_TOKEN || !WA_BUSINESS_ACCOUNT_ID) {
        return res.status(500).json({ error: "WhatsApp API configuration missing" });
    }

    try {
        const url = `https://graph.facebook.com/${VERSION}/${WA_BUSINESS_ACCOUNT_ID}/message_templates?limit=100`;
        const response = await axios.get(url, {
            headers: { Authorization: `Bearer ${WA_ACCESS_TOKEN}` },
        });

        const templates = response.data.data || [];
        return res.json({
            count: templates.length,
            templates: templates.map((t: any) => ({
                name: t.name,
                status: t.status,
                category: t.category,
                language: t.language,
                id: t.id,
            })),
        });
    } catch (error: any) {
        console.error("[Meta Templates] List error:", error.response?.data || error.message);
        return res.status(500).json({ error: error.response?.data?.error?.message || error.message });
    }
});

/**
 * POST /meta-templates/register
 * Register all FitFlow templates with Meta.
 * Skips templates that already exist. Returns results for each.
 */
router.post("/register", authenticate, async (_req: AuthRequest, res: Response) => {
    if (!WA_ACCESS_TOKEN || !WA_BUSINESS_ACCOUNT_ID) {
        return res.status(500).json({ error: "WhatsApp API configuration missing" });
    }

    const url = `https://graph.facebook.com/${VERSION}/${WA_BUSINESS_ACCOUNT_ID}/message_templates`;

    // Fetch existing templates to skip duplicates
    let existingNames: Set<string>;
    try {
        const listResponse = await axios.get(
            `${url}?limit=100&fields=name`,
            { headers: { Authorization: `Bearer ${WA_ACCESS_TOKEN}` } },
        );
        existingNames = new Set((listResponse.data.data || []).map((t: any) => t.name));
    } catch {
        existingNames = new Set();
    }

    const results: Array<{ templateId: string; metaName: string; status: string; error?: string }> = [];

    for (const templateId of Object.values(TemplateId)) {
        const def = META_TEMPLATES[templateId];
        if (!def) {
            results.push({ templateId, metaName: "unknown", status: "skipped", error: "No Meta definition" });
            continue;
        }

        if (existingNames.has(def.metaName)) {
            results.push({ templateId, metaName: def.metaName, status: "exists" });
            continue;
        }

        try {
            const payload = buildCreatePayload(templateId as TemplateId);
            await axios.post(url, payload, {
                headers: { Authorization: `Bearer ${WA_ACCESS_TOKEN}` },
            });
            results.push({ templateId, metaName: def.metaName, status: "created" });
        } catch (error: any) {
            const msg = error.response?.data?.error?.message || error.message;
            console.error(`[Meta Templates] Failed to create ${def.metaName}:`, msg);
            results.push({ templateId, metaName: def.metaName, status: "failed", error: msg });
        }
    }

    const created = results.filter((r) => r.status === "created").length;
    const existed = results.filter((r) => r.status === "exists").length;
    const failed = results.filter((r) => r.status === "failed").length;

    return res.json({
        summary: { created, existed, failed, total: results.length },
        results,
    });
});

/**
 * POST /meta-templates/register/:templateId
 * Register a single template with Meta.
 */
router.post("/register/:templateId", authenticate, async (req: AuthRequest, res: Response) => {
    if (!WA_ACCESS_TOKEN || !WA_BUSINESS_ACCOUNT_ID) {
        return res.status(500).json({ error: "WhatsApp API configuration missing" });
    }

    const templateId = req.params.templateId as TemplateId;
    const def = META_TEMPLATES[templateId];

    if (!def) {
        return res.status(400).json({ error: `Unknown template ID: ${templateId}` });
    }

    const url = `https://graph.facebook.com/${VERSION}/${WA_BUSINESS_ACCOUNT_ID}/message_templates`;

    try {
        const payload = buildCreatePayload(templateId);
        const response = await axios.post(url, payload, {
            headers: { Authorization: `Bearer ${WA_ACCESS_TOKEN}` },
        });

        return res.json({
            templateId,
            metaName: def.metaName,
            status: "created",
            metaResponse: response.data,
        });
    } catch (error: any) {
        const msg = error.response?.data?.error?.message || error.message;
        console.error(`[Meta Templates] Failed to create ${def.metaName}:`, msg);
        return res.status(500).json({
            templateId,
            metaName: def.metaName,
            status: "failed",
            error: msg,
        });
    }
});

/**
 * DELETE /meta-templates/:metaName
 * Delete a template from Meta by its registered name.
 */
router.delete("/:metaName", authenticate, async (req: AuthRequest, res: Response) => {
    if (!WA_ACCESS_TOKEN || !WA_BUSINESS_ACCOUNT_ID) {
        return res.status(500).json({ error: "WhatsApp API configuration missing" });
    }

    const metaName = String(req.params.metaName ?? "");
    if (!metaName) return res.status(400).json({ error: "metaName is required" });
    const url = `https://graph.facebook.com/${VERSION}/${WA_BUSINESS_ACCOUNT_ID}/message_templates?name=${encodeURIComponent(metaName)}`;

    try {
        await axios.delete(url, {
            headers: { Authorization: `Bearer ${WA_ACCESS_TOKEN}` },
        });
        return res.json({ metaName, status: "deleted" });
    } catch (error: any) {
        const msg = error.response?.data?.error?.message || error.message;
        return res.status(500).json({ metaName, status: "failed", error: msg });
    }
});

export default router;
