/**
 * Meta WhatsApp Template Registrar
 *
 * Registers all FitFlow message templates with Meta's WhatsApp Business API.
 * Retries templates that fail due to pending deletion (Meta propagation delay).
 *
 * Usage:
 *   npx tsx scripts/register-meta-templates.ts              # Register missing templates
 *   npx tsx scripts/register-meta-templates.ts --force       # Delete all & re-register
 */

import "dotenv/config";
import axios from "axios";
import { TemplateId } from "@fitflow/shared";
import { META_TEMPLATES, buildCreatePayload } from "../src/lib/templates/meta-templates";

const WA_ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN;
const WA_BUSINESS_ACCOUNT_ID = process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID;
const VERSION = "v22.0";

const forceMode = process.argv.includes("--force");
const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 30_000; // 30 seconds between retry rounds

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
    if (!WA_ACCESS_TOKEN || !WA_BUSINESS_ACCOUNT_ID) {
        console.error("Missing META_WHATSAPP_ACCESS_TOKEN or META_WHATSAPP_BUSINESS_ACCOUNT_ID in .env");
        process.exit(1);
    }

    console.log(`Using WABA: ${WA_BUSINESS_ACCOUNT_ID}`);
    if (forceMode) console.log("Force mode: will delete & re-register all templates");

    const baseUrl = `https://graph.facebook.com/${VERSION}/${WA_BUSINESS_ACCOUNT_ID}/message_templates`;
    const headers = { Authorization: `Bearer ${WA_ACCESS_TOKEN}` };

    // Fetch existing templates
    let existingNames: Set<string>;
    try {
        const listResponse = await axios.get(`${baseUrl}?limit=100&fields=name,status,language`, { headers });
        const templates = listResponse.data.data || [];
        existingNames = new Set(templates.map((t: any) => t.name));
        console.log(`Found ${templates.length} existing templates on WABA\n`);
    } catch (error: any) {
        console.error("Failed to list existing templates:", error.response?.data || error.message);
        process.exit(1);
    }

    // Phase 1: Delete (only in force mode)
    if (forceMode) {
        for (const templateId of Object.values(TemplateId)) {
            const def = META_TEMPLATES[templateId as TemplateId];
            if (!def || !existingNames.has(def.metaName)) continue;
            try {
                await axios.delete(`${baseUrl}?name=${def.metaName}`, { headers });
                console.log(`  DEL   ${def.metaName}`);
            } catch (error: any) {
                console.error(`  FAIL  ${def.metaName} (delete): ${error.response?.data?.error?.message || error.message}`);
            }
        }
        existingNames.clear();
        console.log();
    }

    // Phase 2: Create (with retries for pending-deletion errors)
    let pending = Object.values(TemplateId).filter((id) => {
        const def = META_TEMPLATES[id as TemplateId];
        return def && !existingNames.has(def.metaName);
    }) as TemplateId[];

    let totalCreated = 0;
    let totalSkipped = existingNames.size;

    for (let attempt = 1; attempt <= MAX_RETRIES && pending.length > 0; attempt++) {
        if (attempt > 1) {
            console.log(`\n  Waiting ${RETRY_DELAY_MS / 1000}s for Meta deletion to propagate... (attempt ${attempt}/${MAX_RETRIES})\n`);
            await sleep(RETRY_DELAY_MS);
        }

        const stillPending: TemplateId[] = [];

        for (const templateId of pending) {
            const def = META_TEMPLATES[templateId];

            try {
                const payload = buildCreatePayload(templateId);
                await axios.post(baseUrl, payload, { headers });
                console.log(`  NEW   ${def.metaName} (${def.category}, ${def.language})`);
                totalCreated++;
            } catch (error: any) {
                const errData = error.response?.data?.error;
                const detail = errData?.error_user_msg || "";
                const isDeletionPending = detail.includes("being deleted");

                if (isDeletionPending) {
                    stillPending.push(templateId);
                    if (attempt === 1) console.log(`  WAIT  ${def.metaName} (deletion pending)`);
                } else {
                    const msg = errData?.message || error.message;
                    console.error(`  FAIL  ${def.metaName}: ${msg}`);
                    if (detail) console.error(`        Detail: ${detail}`);
                }
            }
        }

        pending = stillPending;

        if (pending.length === 0) break;
        if (attempt < MAX_RETRIES) {
            console.log(`  ${pending.length} templates still waiting for deletion to clear...`);
        }
    }

    if (pending.length > 0) {
        console.error(`\n  ${pending.length} templates still blocked after ${MAX_RETRIES} retries:`);
        for (const id of pending) {
            console.error(`    - ${META_TEMPLATES[id].metaName}`);
        }
    }

    console.log(`\nDone. Created: ${totalCreated}, Skipped: ${totalSkipped}, Pending: ${pending.length}`);

    if (totalCreated > 0) {
        console.log("\nNewly created templates need Meta approval before they can be sent.");
    }
}

main();
