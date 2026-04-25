/**
 * OpenAPI Spec Generator
 *
 * Reads the registry from openapi.ts and produces a complete OpenAPI 3.0 spec.
 * Output: apps/api/openapi.json (committed to repo, served by swagger-ui-express).
 *
 * Usage:  pnpm docs:generate
 *         tsx src/docs/generate.ts
 */
import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { registry } from "./openapi";
import * as fs from "fs";
import * as path from "path";

const generator = new OpenApiGeneratorV3(registry.definitions);

const doc = generator.generateDocument({
    openapi: "3.0.3",
    info: {
        title: "FitFlow API",
        version: "1.0.0",
        description: [
            "REST API for the FitFlow coaching operations platform.",
            "",
            "FitFlow enables online personal trainers to manage clients, deliver workout and meal plans,",
            "collect check-ins, and process payments — all through WhatsApp or Telegram.",
            "",
            "## Authentication",
            "Most endpoints require a Supabase JWT access token passed as a Bearer token:",
            "```",
            "Authorization: Bearer <supabase_access_token>",
            "```",
            "",
            "## Subscription Tiers",
            "Some endpoints enforce subscription tier requirements (STARTER, PRO, STUDIO).",
            "Responses include `code: TIER_REQUIRED` or `code: LIMIT_REACHED` when access is restricted.",
            "",
            "## Rate Limits",
            "| Endpoint Group | Limit |",
            "|---------------|-------|",
            "| General | 100 req/min |",
            "| `/intake`, `/p/*` | 10 req/min |",
            "| `/webhooks`, `/telegram/webhook` | 200 req/min |",
            "",
            "## Error Format",
            "All errors return JSON with at minimum an `error` field:",
            "```json",
            '{ "error": "Description of what went wrong", "code": "OPTIONAL_ERROR_CODE" }',
            "```",
        ].join("\n"),
        contact: {
            name: "FitFlow",
        },
    },
    servers: [
        { url: "http://localhost:3001", description: "Local development" },
    ],
});

// Write to openapi.json at the package root (apps/api/openapi.json)
const outputPath = path.resolve(__dirname, "../../openapi.json");
fs.writeFileSync(outputPath, JSON.stringify(doc, null, 2), "utf-8");

console.log(`OpenAPI spec generated: ${outputPath}`);
console.log(`  Paths: ${Object.keys(doc.paths ?? {}).length}`);
console.log(`  Schemas: ${Object.keys(doc.components?.schemas ?? {}).length}`);
