/**
 * OpenAPI Registry
 *
 * Central registry that maps every API route to its OpenAPI definition.
 * Uses @asteasolutions/zod-to-openapi to derive schemas from Zod,
 * keeping the spec in sync with actual validation logic.
 *
 * Run `pnpm docs:generate` to produce openapi.json from this file.
 */
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { createClientSchema, updateClientSchema, createPlanSchema, generatePlanSchema } from "../lib/schemas";
import * as S from "./schemas";

export const registry = new OpenAPIRegistry();

// ══════════════════════════════════════════════════════════════
// SECURITY SCHEMES
// ══════════════════════════════════════════════════════════════

registry.registerComponent("securitySchemes", "BearerAuth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
    description: "Supabase JWT access token. Obtained via Supabase Auth (email/password login).",
});

const authed = [{ BearerAuth: [] }];

// ══════════════════════════════════════════════════════════════
// HEALTH CHECK
// ══════════════════════════════════════════════════════════════

registry.registerPath({
    method: "get",
    path: "/health",
    tags: ["Health"],
    summary: "Health check",
    description: "Returns server status and current timestamp. Used by Railway/Render health probes.",
    responses: {
        200: { description: "Server is healthy", content: { "application/json": { schema: S.HealthResponse } } },
    },
});

// ══════════════════════════════════════════════════════════════
// CLIENTS
// ══════════════════════════════════════════════════════════════

registry.registerPath({
    method: "get",
    path: "/clients",
    tags: ["Clients"],
    summary: "List clients",
    description: "Returns all clients belonging to the authenticated coach. Supports pagination.",
    security: authed,
    request: {
        query: z.object({
            limit: z.coerce.number().int().min(1).max(200).default(50).optional(),
            offset: z.coerce.number().int().min(0).default(0).optional(),
        }),
    },
    responses: {
        200: { description: "Array of client objects", content: { "application/json": { schema: z.array(S.ClientResponse) } } },
        401: { description: "Unauthorized", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

registry.registerPath({
    method: "post",
    path: "/clients",
    tags: ["Clients"],
    summary: "Create client",
    description: "Creates a new client for the authenticated coach. Status defaults to PENDING_PAYMENT. Optionally creates a SessionBlock for session-based billing.",
    security: authed,
    request: { body: { content: { "application/json": { schema: createClientSchema } } } },
    responses: {
        201: { description: "Client created", content: { "application/json": { schema: S.CreateClientResponse } } },
        400: { description: "Validation failed", content: { "application/json": { schema: S.ErrorResponse } } },
        403: { description: "Client limit reached for subscription tier", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

registry.registerPath({
    method: "get",
    path: "/clients/{id}",
    tags: ["Clients"],
    summary: "Get client detail",
    description: "Returns a single client with their assignments (including plan), last 20 check-ins, last 20 workout logs, and last 10 messages.",
    security: authed,
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
        200: { description: "Client with relations", content: { "application/json": { schema: S.ClientDetailResponse } } },
        404: { description: "Client not found", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

registry.registerPath({
    method: "patch",
    path: "/clients/{id}",
    tags: ["Clients"],
    summary: "Update client",
    description: "Updates client fields. Status transitions are NOT allowed here — use dedicated flows (payment confirmation, intake completion, plan assignment).",
    security: authed,
    request: {
        params: z.object({ id: z.string().uuid() }),
        body: { content: { "application/json": { schema: updateClientSchema } } },
    },
    responses: {
        200: { description: "Updated client", content: { "application/json": { schema: S.ClientResponse } } },
        400: { description: "Validation failed", content: { "application/json": { schema: S.ErrorResponse } } },
        404: { description: "Client not found", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

registry.registerPath({
    method: "post",
    path: "/clients/{id}/send-intake",
    tags: ["Clients"],
    summary: "Send intake form",
    description: "Queues an onboarding intake job that sends the intake form to the client via their preferred channel.",
    security: authed,
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
        200: { description: "Intake queued", content: { "application/json": { schema: S.SuccessResponse } } },
        404: { description: "Client not found", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

registry.registerPath({
    method: "get",
    path: "/clients/{id}/risk-score",
    tags: ["Clients"],
    summary: "Get client risk score",
    description: "Returns the AI-computed risk score for a client. Score ranges 0-100 with levels LOW/MODERATE/HIGH/CRITICAL. Includes factor breakdown and AI-generated suggestion.",
    security: authed,
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
        200: { description: "Risk score", content: { "application/json": { schema: S.RiskScoreResponse } } },
        404: { description: "No risk score computed yet", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

// ══════════════════════════════════════════════════════════════
// COACHES
// ══════════════════════════════════════════════════════════════

registry.registerPath({
    method: "get",
    path: "/coaches/me",
    tags: ["Coaches"],
    summary: "Get current coach profile",
    description: "Returns the authenticated coach's full profile including computed fields: stripeConnected, whatsappConnected, telegramConnected, telegramDeepLink.",
    security: authed,
    responses: {
        200: { description: "Coach profile", content: { "application/json": { schema: S.CoachProfileResponse } } },
    },
});

registry.registerPath({
    method: "patch",
    path: "/coaches/me",
    tags: ["Coaches"],
    summary: "Update coach profile",
    description: "Updates the authenticated coach's profile. Slug changes create a SlugRedirect (90-day) for the old slug. Slug must be 3-30 chars, lowercase alphanumeric + hyphens, and not a reserved word.",
    security: authed,
    request: {
        body: {
            content: {
                "application/json": {
                    schema: z.object({
                        name: z.string().optional(),
                        slug: z.string().min(3).max(30).optional(),
                        phone: z.string().optional(),
                        businessName: z.string().optional(),
                        timezone: z.string().optional(),
                        specialities: z.array(z.string()).optional(),
                        defaultPaymentModel: S.PaymentModelEnum.optional(),
                        activeClientRange: z.string().optional(),
                        bio: z.string().optional(),
                        avatarUrl: z.string().optional(),
                        profileVisible: z.boolean().optional(),
                        showRatesPublicly: z.boolean().optional(),
                        showWhatsapp: z.boolean().optional(),
                        showTelegram: z.boolean().optional(),
                        defaultPricePerSession: z.number().int().optional(),
                        defaultSessionsPerBlock: z.number().int().optional(),
                        defaultMonthlyRate: z.number().int().optional(),
                        bankDetails: z.string().optional(),
                        billingCurrency: z.string().optional(),
                        defaultChannel: S.MessageChannelEnum.optional(),
                    }),
                },
            },
        },
    },
    responses: {
        200: { description: "Updated coach profile", content: { "application/json": { schema: S.CoachProfileResponse } } },
        400: { description: "Invalid slug or validation error", content: { "application/json": { schema: S.ErrorResponse } } },
        409: { description: "Slug already taken", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

registry.registerPath({
    method: "post",
    path: "/coaches/onboarding/complete",
    tags: ["Coaches"],
    summary: "Complete onboarding",
    description: "Marks the coach's onboarding as completed.",
    security: authed,
    responses: {
        200: { description: "Onboarding completed", content: { "application/json": { schema: z.object({ success: z.boolean(), coach: S.CoachProfileResponse }) } } },
    },
});

registry.registerPath({
    method: "get",
    path: "/coaches/channels",
    tags: ["Coaches"],
    summary: "Get channel connection status",
    description: "Returns the connection status for WhatsApp and Telegram channels, including links and bot usernames.",
    security: authed,
    responses: {
        200: { description: "Channel status", content: { "application/json": { schema: S.ChannelStatusResponse } } },
    },
});

registry.registerPath({
    method: "post",
    path: "/coaches/stripe/connect",
    tags: ["Coaches"],
    summary: "Start Stripe Connect onboarding",
    description: "Creates a Stripe Express Connect account (if not already linked) and returns the onboarding URL. Coaches use this to receive client payments.",
    security: authed,
    request: {
        body: { content: { "application/json": { schema: z.object({ returnPath: z.string().optional() }) } } },
    },
    responses: {
        200: { description: "Stripe onboarding URL", content: { "application/json": { schema: S.CheckoutResponse } } },
        503: { description: "Stripe platform not configured", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

registry.registerPath({
    method: "get",
    path: "/coaches/stripe/dashboard",
    tags: ["Coaches"],
    summary: "Get Stripe Express dashboard link",
    description: "Returns a login link to the coach's Stripe Express dashboard for managing payouts and viewing transactions.",
    security: authed,
    responses: {
        200: { description: "Dashboard URL", content: { "application/json": { schema: S.CheckoutResponse } } },
        400: { description: "No Stripe account linked", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

// ══════════════════════════════════════════════════════════════
// PLANS
// ══════════════════════════════════════════════════════════════

registry.registerPath({
    method: "get",
    path: "/plans",
    tags: ["Plans"],
    summary: "List workout plans",
    description: "Returns all workout plans belonging to the authenticated coach. Each plan includes a computed `daysPerWeek` field.",
    security: authed,
    request: {
        query: z.object({
            limit: z.coerce.number().int().min(1).max(200).default(50).optional(),
            offset: z.coerce.number().int().min(0).default(0).optional(),
        }),
    },
    responses: {
        200: { description: "Array of plans", content: { "application/json": { schema: z.array(S.PlanResponse) } } },
    },
});

registry.registerPath({
    method: "post",
    path: "/plans",
    tags: ["Plans"],
    summary: "Create workout plan",
    description: "Creates a new workout plan with days and exercises. Each day must have at least 1 exercise. Max 14 days per plan.",
    security: authed,
    request: { body: { content: { "application/json": { schema: createPlanSchema } } } },
    responses: {
        201: { description: "Plan created with all nested relations", content: { "application/json": { schema: S.PlanResponse } } },
        400: { description: "Validation failed", content: { "application/json": { schema: S.ErrorResponse } } },
        403: { description: "Plan limit reached", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

registry.registerPath({
    method: "post",
    path: "/plans/generate",
    tags: ["Plans"],
    summary: "AI-generate workout plan",
    description: "Uses Claude AI to generate a workout plan based on optional client context and free-text instructions. Returns a complete plan with exercises from the coach's library.",
    security: authed,
    request: { body: { content: { "application/json": { schema: generatePlanSchema } } } },
    responses: {
        200: { description: "Generated plan", content: { "application/json": { schema: S.PlanResponse } } },
        400: { description: "Validation failed", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

registry.registerPath({
    method: "get",
    path: "/plans/templates",
    tags: ["Plans"],
    summary: "Browse plan templates",
    description: "Returns publicly available workout plan templates. Filterable by comma-separated tags.",
    security: authed,
    request: {
        query: z.object({ tags: z.string().optional() }),
    },
    responses: {
        200: { description: "Array of templates with daysPerWeek and totalExercises", content: { "application/json": { schema: z.array(S.PlanResponse) } } },
    },
});

registry.registerPath({
    method: "post",
    path: "/plans/templates/{id}/use",
    tags: ["Plans"],
    summary: "Clone template into coach's plans",
    description: "Creates a copy of a public template as the coach's own plan.",
    security: authed,
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
        201: { description: "Cloned plan", content: { "application/json": { schema: S.PlanResponse } } },
        404: { description: "Template not found", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

registry.registerPath({
    method: "get",
    path: "/plans/{id}",
    tags: ["Plans"],
    summary: "Get workout plan",
    description: "Returns a single workout plan with all days and exercises.",
    security: authed,
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
        200: { description: "Plan detail", content: { "application/json": { schema: S.PlanResponse } } },
        404: { description: "Plan not found", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

registry.registerPath({
    method: "put",
    path: "/plans/{id}",
    tags: ["Plans"],
    summary: "Update workout plan",
    description: "Replaces the plan's title, description, and all days/exercises. Existing days are deleted and re-created.",
    security: authed,
    request: {
        params: z.object({ id: z.string().uuid() }),
        body: { content: { "application/json": { schema: createPlanSchema } } },
    },
    responses: {
        200: { description: "Updated plan", content: { "application/json": { schema: S.PlanResponse } } },
        404: { description: "Plan not found", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

registry.registerPath({
    method: "post",
    path: "/plans/{id}/duplicate",
    tags: ["Plans"],
    summary: "Duplicate workout plan",
    description: "Creates an exact copy of a plan including all days and exercises. Title is suffixed with '(copy)'.",
    security: authed,
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
        201: { description: "Duplicated plan", content: { "application/json": { schema: S.PlanResponse } } },
        404: { description: "Plan not found", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

registry.registerPath({
    method: "delete",
    path: "/plans/{id}",
    tags: ["Plans"],
    summary: "Delete workout plan",
    description: "Deletes a plan and cascades to days, exercises, and related workout logs.",
    security: authed,
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
        200: { description: "Plan deleted", content: { "application/json": { schema: S.SuccessResponse } } },
        404: { description: "Plan not found", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

// ══════════════════════════════════════════════════════════════
// ASSIGNMENTS
// ══════════════════════════════════════════════════════════════

registry.registerPath({
    method: "post",
    path: "/clients/{id}/assignments",
    tags: ["Assignments"],
    summary: "Assign plan to client",
    description: "Assigns a workout plan to a client. Any existing active assignment is deactivated. scheduleDays is an array of ISO weekday numbers (1=Monday, 7=Sunday).",
    security: authed,
    request: {
        params: z.object({ id: z.string().uuid() }),
        body: {
            content: {
                "application/json": {
                    schema: z.object({
                        planId: z.string().uuid(),
                        startDate: z.string().datetime(),
                        scheduleDays: z.array(z.number().int().min(1).max(7)),
                    }),
                },
            },
        },
    },
    responses: {
        201: { description: "Assignment created", content: { "application/json": { schema: S.PlanAssignmentSchema } } },
        404: { description: "Client or plan not found", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

registry.registerPath({
    method: "get",
    path: "/clients/{id}/assignments",
    tags: ["Assignments"],
    summary: "List client assignments",
    description: "Returns all workout plan assignments for a client, including the plan details.",
    security: authed,
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
        200: { description: "Array of assignments", content: { "application/json": { schema: z.array(S.PlanAssignmentSchema) } } },
    },
});

// ══════════════════════════════════════════════════════════════
// EXERCISES
// ══════════════════════════════════════════════════════════════

registry.registerPath({
    method: "get",
    path: "/exercises",
    tags: ["Exercises"],
    summary: "Search local exercises",
    description: "Searches the local exercise database by name and/or category.",
    security: authed,
    request: {
        query: z.object({
            search: z.string().optional(),
            category: z.string().optional(),
        }),
    },
    responses: {
        200: { description: "Array of exercises", content: { "application/json": { schema: z.array(S.ExerciseResponse) } } },
    },
});

registry.registerPath({
    method: "get",
    path: "/exercises/ymove-search",
    tags: ["Exercises"],
    summary: "Search YMove exercise API",
    description: "Searches the external YMove exercise library. Requires at least `search` or `muscleGroup` parameter. Returns exercises without video URLs (fetched on delivery).",
    security: authed,
    request: {
        query: z.object({
            search: z.string().optional(),
            muscleGroup: z.string().optional(),
            equipment: z.string().optional(),
        }),
    },
    responses: {
        200: { description: "Array of exercises from YMove", content: { "application/json": { schema: z.array(S.ExerciseResponse) } } },
        400: { description: "Missing search or muscleGroup", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

registry.registerPath({
    method: "post",
    path: "/exercises/ymove-import",
    tags: ["Exercises"],
    summary: "Import exercise from YMove",
    description: "Imports an exercise from YMove into the local database by its ymoveId. Upserts if the exercise already exists.",
    security: authed,
    request: {
        body: { content: { "application/json": { schema: z.object({ ymoveId: z.string() }) } } },
    },
    responses: {
        201: { description: "Imported exercise", content: { "application/json": { schema: S.ExerciseResponse } } },
        400: { description: "Invalid ymoveId", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

registry.registerPath({
    method: "get",
    path: "/exercises/unified-search",
    tags: ["Exercises"],
    summary: "Unified exercise search",
    description: "Searches both the local database and YMove API simultaneously, deduplicates results. Requires query of at least 3 characters.",
    security: authed,
    request: {
        query: z.object({ q: z.string().min(3) }),
    },
    responses: {
        200: { description: "Combined results", content: { "application/json": { schema: S.UnifiedSearchResponse } } },
        400: { description: "Query too short", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

// ══════════════════════════════════════════════════════════════
// MEAL PLANS
// ══════════════════════════════════════════════════════════════

registry.registerPath({
    method: "get",
    path: "/meal-plans",
    tags: ["Meal Plans"],
    summary: "List meal plans",
    description: "Returns all meal plans belonging to the authenticated coach.",
    security: authed,
    responses: {
        200: { description: "Array of meal plans", content: { "application/json": { schema: z.array(S.MealPlanResponse) } } },
    },
});

registry.registerPath({
    method: "post",
    path: "/meal-plans",
    tags: ["Meal Plans"],
    summary: "Create meal plan",
    description: "Creates a new meal plan with days and meal entries.",
    security: authed,
    request: {
        body: {
            content: {
                "application/json": {
                    schema: z.object({
                        title: z.string().min(1).max(200),
                        description: z.string().max(2000).optional().nullable(),
                        isTemplate: z.boolean().optional(),
                        days: z.array(z.object({
                            dayNumber: z.number().int().min(1).max(14),
                            title: z.string().optional().nullable(),
                            entries: z.array(z.object({
                                mealId: z.string().uuid(),
                                servingSize: z.string().optional(),
                                notes: z.string().optional().nullable(),
                            })).min(1),
                        })).min(1).max(14),
                    }),
                },
            },
        },
    },
    responses: {
        201: { description: "Meal plan created", content: { "application/json": { schema: S.MealPlanResponse } } },
        400: { description: "Validation failed", content: { "application/json": { schema: S.ErrorResponse } } },
        403: { description: "Meal plan limit reached", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

registry.registerPath({
    method: "post",
    path: "/meal-plans/generate",
    tags: ["Meal Plans"],
    summary: "AI-generate meal plan",
    description: "Uses Claude AI to generate a meal plan based on optional client context and instructions.",
    security: authed,
    request: {
        body: {
            content: {
                "application/json": {
                    schema: z.object({
                        clientId: z.string().uuid().optional(),
                        instructions: z.string().max(1000).optional(),
                    }),
                },
            },
        },
    },
    responses: {
        200: { description: "Generated meal plan", content: { "application/json": { schema: S.MealPlanResponse } } },
    },
});

registry.registerPath({
    method: "get",
    path: "/meal-plans/templates",
    tags: ["Meal Plans"],
    summary: "Browse meal plan templates",
    description: "Returns publicly available meal plan templates. Filterable by comma-separated tags.",
    security: authed,
    request: {
        query: z.object({ tags: z.string().optional() }),
    },
    responses: {
        200: { description: "Array of templates", content: { "application/json": { schema: z.array(S.MealPlanResponse) } } },
    },
});

registry.registerPath({
    method: "post",
    path: "/meal-plans/templates/{id}/use",
    tags: ["Meal Plans"],
    summary: "Clone meal template",
    description: "Creates a copy of a public meal plan template as the coach's own plan.",
    security: authed,
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
        201: { description: "Cloned meal plan", content: { "application/json": { schema: S.MealPlanResponse } } },
        404: { description: "Template not found", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

registry.registerPath({
    method: "get",
    path: "/meal-plans/{id}",
    tags: ["Meal Plans"],
    summary: "Get meal plan",
    description: "Returns a single meal plan with all days and entries.",
    security: authed,
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
        200: { description: "Meal plan detail", content: { "application/json": { schema: S.MealPlanResponse } } },
        404: { description: "Not found", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

registry.registerPath({
    method: "put",
    path: "/meal-plans/{id}",
    tags: ["Meal Plans"],
    summary: "Update meal plan",
    description: "Replaces meal plan title, description, and all days/entries.",
    security: authed,
    request: {
        params: z.object({ id: z.string().uuid() }),
        body: {
            content: {
                "application/json": {
                    schema: z.object({
                        title: z.string().min(1).max(200),
                        description: z.string().max(2000).optional().nullable(),
                        days: z.array(z.object({
                            dayNumber: z.number().int().min(1).max(14),
                            title: z.string().optional().nullable(),
                            entries: z.array(z.object({
                                mealId: z.string().uuid(),
                                servingSize: z.string().optional(),
                                notes: z.string().optional().nullable(),
                            })).min(1),
                        })).min(1).max(14),
                    }),
                },
            },
        },
    },
    responses: {
        200: { description: "Updated meal plan", content: { "application/json": { schema: S.MealPlanResponse } } },
        404: { description: "Not found", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

registry.registerPath({
    method: "post",
    path: "/meal-plans/{id}/duplicate",
    tags: ["Meal Plans"],
    summary: "Duplicate meal plan",
    security: authed,
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
        201: { description: "Duplicated meal plan", content: { "application/json": { schema: S.MealPlanResponse } } },
        404: { description: "Not found", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

registry.registerPath({
    method: "delete",
    path: "/meal-plans/{id}",
    tags: ["Meal Plans"],
    summary: "Delete meal plan",
    security: authed,
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
        200: { description: "Deleted", content: { "application/json": { schema: S.SuccessResponse } } },
        404: { description: "Not found", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

// ══════════════════════════════════════════════════════════════
// MEAL ASSIGNMENTS
// ══════════════════════════════════════════════════════════════

registry.registerPath({
    method: "post",
    path: "/clients/{id}/meal-assignments",
    tags: ["Meal Assignments"],
    summary: "Assign meal plan to client",
    description: "Assigns a meal plan to a client. Deactivates any existing active meal assignment.",
    security: authed,
    request: {
        params: z.object({ id: z.string().uuid() }),
        body: {
            content: {
                "application/json": {
                    schema: z.object({
                        planId: z.string().uuid(),
                        startDate: z.string().datetime(),
                        scheduleDays: z.array(z.number().int().min(1).max(7)),
                    }),
                },
            },
        },
    },
    responses: {
        201: { description: "Assignment created", content: { "application/json": { schema: S.MealAssignmentSchema } } },
    },
});

registry.registerPath({
    method: "get",
    path: "/clients/{id}/meal-assignments",
    tags: ["Meal Assignments"],
    summary: "List client meal assignments",
    security: authed,
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
        200: { description: "Array of meal assignments", content: { "application/json": { schema: z.array(S.MealAssignmentSchema) } } },
    },
});

registry.registerPath({
    method: "patch",
    path: "/clients/{id}/meal-assignments/{assignmentId}",
    tags: ["Meal Assignments"],
    summary: "Update meal assignment",
    description: "Updates assignment status (isActive) or schedule days.",
    security: authed,
    request: {
        params: z.object({ id: z.string().uuid(), assignmentId: z.string().uuid() }),
        body: {
            content: {
                "application/json": {
                    schema: z.object({
                        isActive: z.boolean().optional(),
                        scheduleDays: z.array(z.number().int().min(1).max(7)).optional(),
                    }),
                },
            },
        },
    },
    responses: {
        200: { description: "Updated assignment", content: { "application/json": { schema: S.MealAssignmentSchema } } },
    },
});

// ══════════════════════════════════════════════════════════════
// MEALS
// ══════════════════════════════════════════════════════════════

registry.registerPath({
    method: "get",
    path: "/meals",
    tags: ["Meals"],
    summary: "Search meals",
    description: "Searches the meal database by name and/or category.",
    security: authed,
    request: {
        query: z.object({
            search: z.string().optional(),
            category: z.string().optional(),
        }),
    },
    responses: {
        200: { description: "Array of meals", content: { "application/json": { schema: z.array(S.MealSchema) } } },
    },
});

registry.registerPath({
    method: "post",
    path: "/meals",
    tags: ["Meals"],
    summary: "Create meal",
    description: "Creates a new meal in the database with optional macro data.",
    security: authed,
    request: {
        body: {
            content: {
                "application/json": {
                    schema: z.object({
                        name: z.string().min(1),
                        category: z.string(),
                        protein: z.number().optional(),
                        carbs: z.number().optional(),
                        fat: z.number().optional(),
                        calories: z.number().int().optional(),
                        ingredients: z.array(z.string()).optional(),
                        prepTime: z.string().optional(),
                        recipeUrl: z.string().optional(),
                        spoonacularId: z.number().int().optional(),
                        imageUrl: z.string().optional(),
                    }),
                },
            },
        },
    },
    responses: {
        201: { description: "Meal created", content: { "application/json": { schema: S.MealSchema } } },
    },
});

// ══════════════════════════════════════════════════════════════
// NUTRITION
// ══════════════════════════════════════════════════════════════

registry.registerPath({
    method: "get",
    path: "/nutrition/ingredients",
    tags: ["Nutrition"],
    summary: "Search ingredients",
    description: "Searches the Spoonacular API for ingredients with nutritional data. Min 2 character query.",
    security: authed,
    request: {
        query: z.object({
            q: z.string().min(2),
            limit: z.coerce.number().int().max(25).optional(),
        }),
    },
    responses: {
        200: { description: "Array of ingredients", content: { "application/json": { schema: z.array(S.NutritionIngredientResponse) } } },
    },
});

registry.registerPath({
    method: "get",
    path: "/nutrition/recipes",
    tags: ["Nutrition"],
    summary: "Search recipes",
    description: "Searches the Spoonacular API for recipes with optional diet and calorie filters.",
    security: authed,
    request: {
        query: z.object({
            q: z.string(),
            diet: z.string().optional(),
            maxCalories: z.coerce.number().optional(),
            limit: z.coerce.number().int().optional(),
        }),
    },
    responses: {
        200: { description: "Array of recipes", content: { "application/json": { schema: z.array(S.NutritionRecipeResponse) } } },
    },
});

registry.registerPath({
    method: "get",
    path: "/nutrition/recipes/{id}",
    tags: ["Nutrition"],
    summary: "Get recipe detail",
    description: "Returns full recipe details from Spoonacular by ID.",
    security: authed,
    request: { params: z.object({ id: z.coerce.number().int() }) },
    responses: {
        200: { description: "Recipe detail", content: { "application/json": { schema: S.NutritionRecipeResponse } } },
    },
});

// ══════════════════════════════════════════════════════════════
// MESSAGES
// ══════════════════════════════════════════════════════════════

registry.registerPath({
    method: "get",
    path: "/messages/conversations",
    tags: ["Messages"],
    summary: "List conversations",
    description: "Returns summarized conversations for the coach. Pinned conversations appear first, then sorted by most recent message.",
    security: authed,
    responses: {
        200: { description: "Array of conversations", content: { "application/json": { schema: z.array(S.ConversationResponse) } } },
    },
});

registry.registerPath({
    method: "get",
    path: "/messages/{clientId}",
    tags: ["Messages"],
    summary: "Get conversation history",
    description: "Returns paginated messages for a specific client conversation.",
    security: authed,
    request: {
        params: z.object({ clientId: z.string().uuid() }),
        query: z.object({
            limit: z.coerce.number().int().min(1).max(200).default(50).optional(),
            offset: z.coerce.number().int().min(0).default(0).optional(),
        }),
    },
    responses: {
        200: { description: "Array of messages", content: { "application/json": { schema: z.array(S.MessageSchema) } } },
    },
});

registry.registerPath({
    method: "post",
    path: "/messages/{clientId}",
    tags: ["Messages"],
    summary: "Send message to client",
    description: "Sends a text message to the client via their preferred channel. For WhatsApp, checks the 24-hour messaging window — if closed, sends via approved template instead.",
    security: authed,
    request: {
        params: z.object({ clientId: z.string().uuid() }),
        body: { content: { "application/json": { schema: z.object({ content: z.string().min(1) }) } } },
    },
    responses: {
        201: { description: "Message sent", content: { "application/json": { schema: S.MessageSchema } } },
        502: { description: "Channel delivery failed", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

registry.registerPath({
    method: "get",
    path: "/messages/{clientId}/window-status",
    tags: ["Messages"],
    summary: "Get WhatsApp messaging window status",
    description: "Returns whether the 24-hour WhatsApp messaging window is open for this client, when it expires, and what message types are allowed.",
    security: authed,
    request: { params: z.object({ clientId: z.string().uuid() }) },
    responses: {
        200: { description: "Window status", content: { "application/json": { schema: S.WindowStatusResponse } } },
    },
});

registry.registerPath({
    method: "patch",
    path: "/messages/{clientId}/pin",
    tags: ["Messages"],
    summary: "Toggle conversation pin",
    description: "Toggles whether a conversation is pinned to the top of the message list.",
    security: authed,
    request: { params: z.object({ clientId: z.string().uuid() }) },
    responses: {
        200: { description: "Pin status", content: { "application/json": { schema: z.object({ pinned: z.boolean() }) } } },
    },
});

registry.registerPath({
    method: "patch",
    path: "/messages/{clientId}/archive",
    tags: ["Messages"],
    summary: "Toggle conversation archive",
    security: authed,
    request: { params: z.object({ clientId: z.string().uuid() }) },
    responses: {
        200: { description: "Archive status", content: { "application/json": { schema: z.object({ archived: z.boolean() }) } } },
    },
});

registry.registerPath({
    method: "delete",
    path: "/messages/{clientId}",
    tags: ["Messages"],
    summary: "Clear conversation",
    description: "Deletes all messages in a client conversation.",
    security: authed,
    request: { params: z.object({ clientId: z.string().uuid() }) },
    responses: {
        200: { description: "Conversation cleared", content: { "application/json": { schema: z.object({ deleted: z.literal(true) }) } } },
    },
});

// ══════════════════════════════════════════════════════════════
// PAYMENTS
// ══════════════════════════════════════════════════════════════

registry.registerPath({
    method: "post",
    path: "/payments/checkout",
    tags: ["Payments"],
    summary: "Create Stripe checkout session",
    description: "Creates a Stripe Checkout session for a client payment. The coach must have Stripe Connect onboarding completed. Available on all subscription tiers.",
    security: authed,
    request: {
        body: {
            content: {
                "application/json": {
                    schema: z.object({
                        clientId: z.string().uuid(),
                        amount: z.number().int().optional(),
                        currency: z.string().optional(),
                    }),
                },
            },
        },
    },
    responses: {
        200: { description: "Checkout URL", content: { "application/json": { schema: S.CheckoutResponse } } },
        400: { description: "Missing client or amount", content: { "application/json": { schema: S.ErrorResponse } } },
        503: { description: "Stripe not configured", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

registry.registerPath({
    method: "post",
    path: "/payments/confirm-bank-transfer",
    tags: ["Payments"],
    summary: "Confirm bank transfer payment",
    description: "Manually confirms a bank transfer payment. Creates a Payment record and transitions the client status. PRO/STUDIO tier required.",
    security: authed,
    request: {
        body: {
            content: {
                "application/json": {
                    schema: z.object({
                        clientId: z.string().uuid(),
                        amount: z.number().int().optional(),
                        paymentId: z.string().uuid().optional(),
                        currency: z.string().optional(),
                        force: z.boolean().optional(),
                    }),
                },
            },
        },
    },
    responses: {
        200: { description: "Payment confirmed", content: { "application/json": { schema: S.BankTransferConfirmResponse } } },
        409: { description: "Duplicate payment detected", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

registry.registerPath({
    method: "post",
    path: "/payments/send-bank-details",
    tags: ["Payments"],
    summary: "Send bank details to client",
    description: "Sends the coach's bank transfer details to a client via their preferred channel. Creates a PENDING payment record.",
    security: authed,
    request: {
        body: {
            content: {
                "application/json": {
                    schema: z.object({
                        clientId: z.string().uuid(),
                        amount: z.number().int(),
                        bankTransferDetails: z.string(),
                        currency: z.string().optional(),
                    }),
                },
            },
        },
    },
    responses: {
        200: { description: "Bank details sent", content: { "application/json": { schema: z.object({ success: z.boolean(), payment: S.PaymentResponse }) } } },
    },
});

registry.registerPath({
    method: "get",
    path: "/payments/history",
    tags: ["Payments"],
    summary: "Payment history",
    description: "Returns all payments for the coach's clients with client name resolved.",
    security: authed,
    responses: {
        200: { description: "Array of payments", content: { "application/json": { schema: z.array(S.PaymentResponse) } } },
    },
});

registry.registerPath({
    method: "post",
    path: "/payments/{paymentId}/remind",
    tags: ["Payments"],
    summary: "Send payment reminder",
    description: "Sends a payment reminder message to the client via their preferred channel.",
    security: authed,
    request: { params: z.object({ paymentId: z.string().uuid() }) },
    responses: {
        200: { description: "Reminder sent", content: { "application/json": { schema: S.SuccessResponse } } },
    },
});

registry.registerPath({
    method: "get",
    path: "/payments/{paymentId}/receipt",
    tags: ["Payments"],
    summary: "Get payment receipt",
    description: "Returns a receipt URL (Stripe payments) or HTML receipt (bank transfers).",
    security: authed,
    request: { params: z.object({ paymentId: z.string().uuid() }) },
    responses: {
        200: { description: "Receipt", content: { "application/json": { schema: S.ReceiptResponse } } },
        404: { description: "Payment not found", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

// ══════════════════════════════════════════════════════════════
// SUBSCRIPTIONS
// ══════════════════════════════════════════════════════════════

registry.registerPath({
    method: "get",
    path: "/subscriptions/tiers",
    tags: ["Subscriptions"],
    summary: "List subscription tiers",
    description: "Returns all available tiers with pricing in the coach's billing currency and feature limits.",
    security: authed,
    responses: {
        200: { description: "Tier list", content: { "application/json": { schema: S.TierListResponse } } },
    },
});

registry.registerPath({
    method: "get",
    path: "/subscriptions/status",
    tags: ["Subscriptions"],
    summary: "Get subscription status",
    description: "Returns the coach's current subscription including tier, status, usage counts (clients, plans, meal plans, offers), trial info, and limits.",
    security: authed,
    responses: {
        200: { description: "Subscription status", content: { "application/json": { schema: S.SubscriptionStatusResponse } } },
    },
});

registry.registerPath({
    method: "post",
    path: "/subscriptions/checkout",
    tags: ["Subscriptions"],
    summary: "Create subscription checkout",
    description: "Creates a Stripe Checkout session for subscribing to a tier. Creates a Stripe Customer if one doesn't exist.",
    security: authed,
    request: {
        body: {
            content: {
                "application/json": {
                    schema: z.object({
                        tier: S.SubscriptionTierEnum,
                        interval: S.BillingIntervalEnum,
                    }),
                },
            },
        },
    },
    responses: {
        200: { description: "Checkout URL", content: { "application/json": { schema: S.CheckoutResponse } } },
    },
});

registry.registerPath({
    method: "post",
    path: "/subscriptions/portal",
    tags: ["Subscriptions"],
    summary: "Get customer portal link",
    description: "Returns a Stripe Customer Portal session URL for managing the subscription (cancel, change payment method, view invoices).",
    security: authed,
    responses: {
        200: { description: "Portal URL", content: { "application/json": { schema: S.CheckoutResponse } } },
    },
});

registry.registerPath({
    method: "post",
    path: "/subscriptions/change",
    tags: ["Subscriptions"],
    summary: "Change subscription tier",
    description: "Upgrades or downgrades the coach's subscription. Changes take effect immediately for upgrades, at period end for downgrades.",
    security: authed,
    request: {
        body: {
            content: {
                "application/json": {
                    schema: z.object({
                        tier: S.SubscriptionTierEnum,
                        interval: S.BillingIntervalEnum.optional(),
                    }),
                },
            },
        },
    },
    responses: {
        200: { description: "Change confirmed", content: { "application/json": { schema: S.SubscriptionChangeResponse } } },
    },
});

registry.registerPath({
    method: "get",
    path: "/subscriptions/invoices",
    tags: ["Subscriptions"],
    summary: "List invoices",
    description: "Returns the coach's Stripe invoices with hosted and PDF download links.",
    security: authed,
    responses: {
        200: { description: "Invoice list", content: { "application/json": { schema: S.InvoiceListResponse } } },
    },
});

// ══════════════════════════════════════════════════════════════
// LEADS
// ══════════════════════════════════════════════════════════════

registry.registerPath({
    method: "get",
    path: "/leads",
    tags: ["Leads"],
    summary: "List leads",
    description: "Returns all leads for the coach. Filterable by status. Includes offer info and unread message count.",
    security: authed,
    request: {
        query: z.object({
            status: S.LeadStatusEnum.optional(),
            limit: z.coerce.number().int().min(1).max(200).default(50).optional(),
            offset: z.coerce.number().int().min(0).default(0).optional(),
        }),
    },
    responses: {
        200: { description: "Array of leads", content: { "application/json": { schema: z.array(S.LeadResponse) } } },
    },
});

registry.registerPath({
    method: "get",
    path: "/leads/{id}",
    tags: ["Leads"],
    summary: "Get lead",
    security: authed,
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
        200: { description: "Lead detail", content: { "application/json": { schema: S.LeadResponse } } },
        404: { description: "Not found", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

registry.registerPath({
    method: "patch",
    path: "/leads/{id}",
    tags: ["Leads"],
    summary: "Update lead",
    description: "Updates lead status and/or notes. Only `status` and `notes` fields are allowed.",
    security: authed,
    request: {
        params: z.object({ id: z.string().uuid() }),
        body: {
            content: {
                "application/json": {
                    schema: z.object({
                        status: S.LeadStatusEnum.optional(),
                        notes: z.string().optional(),
                    }),
                },
            },
        },
    },
    responses: {
        200: { description: "Updated", content: { "application/json": { schema: S.SuccessResponse } } },
    },
});

registry.registerPath({
    method: "post",
    path: "/leads/{id}/convert",
    tags: ["Leads"],
    summary: "Convert lead to client",
    description: "Converts a lead into a client record. Creates the Client, migrates messages, and marks the lead as CONVERTED.",
    security: authed,
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
        201: { description: "Client created from lead", content: { "application/json": { schema: S.ClientResponse } } },
        400: { description: "Lead already converted", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

registry.registerPath({
    method: "post",
    path: "/leads/{id}/start-intake",
    tags: ["Leads"],
    summary: "Send intake form to lead",
    description: "Triggers the intake questionnaire for a lead via their channel.",
    security: authed,
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
        200: { description: "Intake sent", content: { "application/json": { schema: S.SuccessResponse } } },
    },
});

registry.registerPath({
    method: "get",
    path: "/leads/{id}/messages",
    tags: ["Leads"],
    summary: "Get lead messages",
    description: "Returns paginated messages for a lead conversation.",
    security: authed,
    request: {
        params: z.object({ id: z.string().uuid() }),
        query: z.object({
            limit: z.coerce.number().int().min(1).max(200).default(50).optional(),
            offset: z.coerce.number().int().min(0).default(0).optional(),
        }),
    },
    responses: {
        200: { description: "Array of messages", content: { "application/json": { schema: z.array(S.MessageSchema) } } },
    },
});

registry.registerPath({
    method: "post",
    path: "/leads/{id}/messages",
    tags: ["Leads"],
    summary: "Send message to lead",
    description: "Sends a text message to a lead via Telegram.",
    security: authed,
    request: {
        params: z.object({ id: z.string().uuid() }),
        body: { content: { "application/json": { schema: z.object({ content: z.string().min(1) }) } } },
    },
    responses: {
        201: { description: "Message sent", content: { "application/json": { schema: S.MessageSchema } } },
    },
});

// ══════════════════════════════════════════════════════════════
// OFFERS
// ══════════════════════════════════════════════════════════════

registry.registerPath({
    method: "get",
    path: "/offers",
    tags: ["Offers"],
    summary: "List offers",
    description: "Returns all offers for the coach with lead count.",
    security: authed,
    responses: {
        200: { description: "Array of offers", content: { "application/json": { schema: z.array(S.OfferResponse) } } },
    },
});

registry.registerPath({
    method: "post",
    path: "/offers",
    tags: ["Offers"],
    summary: "Create offer",
    description: "Creates a new marketing offer. The slug must be unique within the coach's offers.",
    security: authed,
    request: {
        body: {
            content: {
                "application/json": {
                    schema: z.object({
                        name: z.string().min(1),
                        slug: z.string().min(1),
                        channelParam: S.MessageChannelEnum.optional(),
                        ctaType: z.string().optional(),
                        paymentRoute: z.string().optional(),
                        sourceTags: z.array(z.string()).optional(),
                    }),
                },
            },
        },
    },
    responses: {
        201: { description: "Offer created", content: { "application/json": { schema: S.OfferResponse } } },
        403: { description: "Offer limit reached", content: { "application/json": { schema: S.ErrorResponse } } },
        409: { description: "Slug already taken", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

registry.registerPath({
    method: "get",
    path: "/offers/{id}",
    tags: ["Offers"],
    summary: "Get offer",
    description: "Returns an offer with its associated leads.",
    security: authed,
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
        200: { description: "Offer with leads", content: { "application/json": { schema: S.OfferResponse } } },
        404: { description: "Not found", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

registry.registerPath({
    method: "patch",
    path: "/offers/{id}",
    tags: ["Offers"],
    summary: "Update offer",
    security: authed,
    request: {
        params: z.object({ id: z.string().uuid() }),
        body: {
            content: {
                "application/json": {
                    schema: z.object({
                        name: z.string().optional(),
                        channelParam: S.MessageChannelEnum.nullable().optional(),
                        ctaType: z.string().nullable().optional(),
                        paymentRoute: z.string().nullable().optional(),
                        sourceTags: z.array(z.string()).optional(),
                        isActive: z.boolean().optional(),
                    }),
                },
            },
        },
    },
    responses: {
        200: { description: "Updated", content: { "application/json": { schema: S.SuccessResponse } } },
    },
});

registry.registerPath({
    method: "delete",
    path: "/offers/{id}",
    tags: ["Offers"],
    summary: "Delete offer",
    security: authed,
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
        200: { description: "Deleted", content: { "application/json": { schema: S.SuccessResponse } } },
    },
});

// ══════════════════════════════════════════════════════════════
// ANALYTICS
// ══════════════════════════════════════════════════════════════

registry.registerPath({
    method: "get",
    path: "/analytics/summary",
    tags: ["Analytics"],
    summary: "Get analytics summary",
    description: "Returns aggregated KPIs for the coach: total clients, active plans, workout count, compliance rate, revenue, at-risk count, channel breakdown, new leads. Requires PRO or STUDIO tier.",
    security: authed,
    responses: {
        200: { description: "Analytics summary", content: { "application/json": { schema: S.AnalyticsSummaryResponse } } },
        403: { description: "Tier required", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

registry.registerPath({
    method: "get",
    path: "/analytics/events",
    tags: ["Analytics"],
    summary: "Get event log",
    description: "Returns recent events for the coach with resolved client names.",
    security: authed,
    request: {
        query: z.object({ limit: z.coerce.number().int().optional() }),
    },
    responses: {
        200: { description: "Array of events", content: { "application/json": { schema: z.array(S.EventLogSchema) } } },
    },
});

// ══════════════════════════════════════════════════════════════
// ADMIN
// ══════════════════════════════════════════════════════════════

const adminSecurity = authed; // Also requires PLATFORM_ADMIN_IDS check

registry.registerPath({
    method: "get",
    path: "/admin/overview",
    tags: ["Admin"],
    summary: "Platform overview",
    description: "Returns platform-wide KPIs: total coaches, clients, active subscriptions, MRR, revenue, tier breakdown. **Requires platform admin role** (PLATFORM_ADMIN_IDS env var).",
    security: adminSecurity,
    responses: {
        200: { description: "Platform overview", content: { "application/json": { schema: S.AdminOverviewResponse } } },
        403: { description: "Not a platform admin", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

registry.registerPath({
    method: "get",
    path: "/admin/coaches",
    tags: ["Admin"],
    summary: "List all coaches",
    description: "Paginated, searchable, filterable list of all coaches on the platform. Includes subscription info and client count.",
    security: adminSecurity,
    request: {
        query: z.object({
            page: z.coerce.number().int().default(1).optional(),
            limit: z.coerce.number().int().default(20).optional(),
            search: z.string().optional(),
            tier: S.SubscriptionTierEnum.optional(),
            status: S.SubscriptionStatusEnum.optional(),
            sort: z.string().default("createdAt").optional(),
            order: z.enum(["asc", "desc"]).default("desc").optional(),
        }),
    },
    responses: {
        200: { description: "Paginated coach list", content: { "application/json": { schema: S.AdminCoachListResponse } } },
    },
});

registry.registerPath({
    method: "get",
    path: "/admin/coaches/{id}",
    tags: ["Admin"],
    summary: "Get coach detail (admin)",
    description: "Returns a single coach with subscription, client count, revenue, and recent events.",
    security: adminSecurity,
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
        200: { description: "Coach detail", content: { "application/json": { schema: S.AdminCoachSchema } } },
        404: { description: "Not found", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

registry.registerPath({
    method: "get",
    path: "/admin/coaches/{id}/clients",
    tags: ["Admin"],
    summary: "List coach's clients (admin)",
    security: adminSecurity,
    request: {
        params: z.object({ id: z.string().uuid() }),
        query: z.object({
            page: z.coerce.number().int().default(1).optional(),
            limit: z.coerce.number().int().default(20).optional(),
        }),
    },
    responses: {
        200: { description: "Paginated client list", content: { "application/json": { schema: z.object({ clients: z.array(S.ClientResponse), total: z.number().int(), page: z.number().int(), limit: z.number().int() }) } } },
    },
});

registry.registerPath({
    method: "get",
    path: "/admin/revenue",
    tags: ["Admin"],
    summary: "Revenue analytics (admin)",
    description: "Returns MRR breakdown by tier, monthly revenue trend, payment volume, churn rate, and recent subscription changes.",
    security: adminSecurity,
    responses: {
        200: { description: "Revenue data", content: { "application/json": { schema: S.AdminRevenueResponse } } },
    },
});

registry.registerPath({
    method: "get",
    path: "/admin/events",
    tags: ["Admin"],
    summary: "Platform event log (admin)",
    description: "Returns platform-wide events with filtering by event type, coach, and date range.",
    security: adminSecurity,
    request: {
        query: z.object({
            limit: z.coerce.number().int().default(50).optional(),
            page: z.coerce.number().int().default(1).optional(),
            eventType: z.string().optional(),
            coachId: z.string().uuid().optional(),
            after: z.string().datetime().optional(),
            before: z.string().datetime().optional(),
        }),
    },
    responses: {
        200: { description: "Paginated events", content: { "application/json": { schema: z.object({ events: z.array(S.EventLogSchema), total: z.number().int(), page: z.number().int(), limit: z.number().int() }) } } },
    },
});

// ══════════════════════════════════════════════════════════════
// SHORT LINKS
// ══════════════════════════════════════════════════════════════

registry.registerPath({
    method: "get",
    path: "/short-links",
    tags: ["Short Links"],
    summary: "List short links",
    description: "Returns all short links for the coach with computed shortUrl and click counts.",
    security: authed,
    responses: {
        200: { description: "Array of links", content: { "application/json": { schema: z.array(S.ShortLinkResponse) } } },
    },
});

registry.registerPath({
    method: "post",
    path: "/short-links",
    tags: ["Short Links"],
    summary: "Create short link",
    security: authed,
    request: {
        body: {
            content: {
                "application/json": {
                    schema: z.object({
                        code: z.string().min(1),
                        targetUrl: z.string().url(),
                        label: z.string().optional(),
                    }),
                },
            },
        },
    },
    responses: {
        201: { description: "Link created", content: { "application/json": { schema: S.ShortLinkResponse } } },
        409: { description: "Code already taken", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

registry.registerPath({
    method: "delete",
    path: "/short-links/{id}",
    tags: ["Short Links"],
    summary: "Delete short link",
    security: authed,
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
        200: { description: "Deleted", content: { "application/json": { schema: S.SuccessResponse } } },
    },
});

registry.registerPath({
    method: "get",
    path: "/go/{code}",
    tags: ["Short Links"],
    summary: "Resolve short link",
    description: "Resolves a short link code to its target URL. Increments click counter. No authentication required.",
    request: { params: z.object({ code: z.string() }) },
    responses: {
        200: { description: "Target URL", content: { "application/json": { schema: z.object({ targetUrl: z.string() }) } } },
        404: { description: "Link not found", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

// ══════════════════════════════════════════════════════════════
// PUBLIC PROFILES
// ══════════════════════════════════════════════════════════════

registry.registerPath({
    method: "get",
    path: "/p/profile/{slug}",
    tags: ["Public Profiles"],
    summary: "Get public coach profile",
    description: "Returns public profile info for a coach by their slug. No authentication required. Handles slug redirects (90-day window). Query param `c` sets channel context.",
    request: {
        params: z.object({ slug: z.string() }),
        query: z.object({ c: z.string().optional() }),
    },
    responses: {
        200: { description: "Public profile", content: { "application/json": { schema: S.PublicProfileResponse } } },
        404: { description: "Coach not found", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

registry.registerPath({
    method: "post",
    path: "/p/profile/{slug}/event",
    tags: ["Public Profiles"],
    summary: "Track profile event",
    description: "Records a profile analytics event (viewed, channel_click, redirect, link_copied). IP is hashed for privacy.",
    request: {
        params: z.object({ slug: z.string() }),
        body: {
            content: {
                "application/json": {
                    schema: z.object({
                        event: z.string(),
                        channel: z.string().optional(),
                        source: z.string().optional(),
                    }),
                },
            },
        },
    },
    responses: {
        200: { description: "Event recorded", content: { "application/json": { schema: S.SuccessResponse } } },
    },
});

registry.registerPath({
    method: "get",
    path: "/p/{coachSlug}/{offerSlug}",
    tags: ["Public Profiles"],
    summary: "Get offer landing page",
    description: "Returns coach and offer info for a landing page. No auth required.",
    request: {
        params: z.object({ coachSlug: z.string(), offerSlug: z.string() }),
        query: z.object({ ch: z.string().optional(), src: z.string().optional() }),
    },
    responses: {
        200: { description: "Landing page data", content: { "application/json": { schema: S.OfferLandingResponse } } },
        404: { description: "Not found", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

registry.registerPath({
    method: "post",
    path: "/p/{coachSlug}/{offerSlug}/apply",
    tags: ["Public Profiles"],
    summary: "Submit lead application",
    description: "Creates a new lead from a public offer landing page. Rate limited to 10 req/min.",
    request: {
        params: z.object({ coachSlug: z.string(), offerSlug: z.string() }),
        body: {
            content: {
                "application/json": {
                    schema: z.object({
                        name: z.string().min(1),
                        phone: z.string().optional(),
                        email: z.string().email().optional(),
                        telegramChatId: z.string().optional(),
                        channel: S.MessageChannelEnum.optional(),
                        source: z.string().optional(),
                        intakeData: z.any().optional(),
                    }),
                },
            },
        },
    },
    responses: {
        201: { description: "Lead created", content: { "application/json": { schema: S.LeadApplyResponse } } },
        400: { description: "Validation failed", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

// ══════════════════════════════════════════════════════════════
// INTAKE
// ══════════════════════════════════════════════════════════════

registry.registerPath({
    method: "post",
    path: "/intake",
    tags: ["Intake"],
    summary: "Submit intake form",
    description: "Public endpoint for clients/leads to submit their onboarding intake form. Requires a valid intake token. Transitions client from INTAKE_SENT to ACTIVE, or lead from NEW to INTAKE_COMPLETE. Rate limited to 10 req/min.",
    request: {
        body: {
            content: {
                "application/json": {
                    schema: z.object({
                        clientId: z.string().uuid(),
                        token: z.string(),
                        goals: z.string().optional(),
                        medicalNotes: z.string().optional(),
                        equipment: z.string().optional(),
                        experience: z.string().optional(),
                    }),
                },
            },
        },
    },
    responses: {
        200: { description: "Intake submitted", content: { "application/json": { schema: S.IntakeSubmitResponse } } },
        400: { description: "Invalid or expired token", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

registry.registerPath({
    method: "get",
    path: "/intake/{id}",
    tags: ["Intake"],
    summary: "Get intake info",
    description: "Returns the client/lead name for an intake form page. Requires a valid token as query parameter.",
    request: {
        params: z.object({ id: z.string().uuid() }),
        query: z.object({ token: z.string() }),
    },
    responses: {
        200: { description: "Client/lead name", content: { "application/json": { schema: S.IntakeInfoResponse } } },
        404: { description: "Not found or invalid token", content: { "application/json": { schema: S.ErrorResponse } } },
    },
});

// ══════════════════════════════════════════════════════════════
// FLOWS (WhatsApp Flows - Admin Only)
// ══════════════════════════════════════════════════════════════

registry.registerPath({
    method: "get",
    path: "/flows",
    tags: ["Flows"],
    summary: "List WhatsApp Flows",
    description: "Returns all WhatsApp Flows from the Meta API. **Requires platform admin role.**",
    security: adminSecurity,
    responses: {
        200: { description: "Flow list", content: { "application/json": { schema: z.object({ flows: z.array(S.FlowResponse) }) } } },
    },
});

registry.registerPath({
    method: "post",
    path: "/flows/create",
    tags: ["Flows"],
    summary: "Create WhatsApp Flow",
    description: "Creates a new WhatsApp Flow of type weekly_checkin or workout_log. **Requires platform admin role.**",
    security: adminSecurity,
    request: {
        body: {
            content: {
                "application/json": {
                    schema: z.object({
                        name: z.string(),
                        type: z.enum(["weekly_checkin", "workout_log"]),
                    }),
                },
            },
        },
    },
    responses: {
        200: { description: "Flow created", content: { "application/json": { schema: z.object({ success: z.boolean(), flow: S.FlowResponse, message: z.string() }) } } },
    },
});

registry.registerPath({
    method: "post",
    path: "/flows/{flowId}/publish",
    tags: ["Flows"],
    summary: "Publish WhatsApp Flow",
    description: "Publishes a draft WhatsApp Flow. **Requires platform admin role.**",
    security: adminSecurity,
    request: { params: z.object({ flowId: z.string() }) },
    responses: {
        200: { description: "Published", content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string() }) } } },
    },
});

registry.registerPath({
    method: "post",
    path: "/flows/send/checkin",
    tags: ["Flows"],
    summary: "Send check-in flow to client",
    description: "Sends a WhatsApp check-in Flow to a specific client.",
    security: authed,
    request: {
        body: {
            content: {
                "application/json": {
                    schema: z.object({
                        clientId: z.string().uuid(),
                        flowId: z.string(),
                        mode: z.string().optional(),
                    }),
                },
            },
        },
    },
    responses: {
        200: { description: "Flow sent", content: { "application/json": { schema: S.FlowSendResponse } } },
    },
});

registry.registerPath({
    method: "post",
    path: "/flows/send/workout",
    tags: ["Flows"],
    summary: "Send workout log flow to client",
    security: authed,
    request: {
        body: {
            content: {
                "application/json": {
                    schema: z.object({
                        clientId: z.string().uuid(),
                        flowId: z.string(),
                        mode: z.string().optional(),
                    }),
                },
            },
        },
    },
    responses: {
        200: { description: "Flow sent", content: { "application/json": { schema: S.FlowSendResponse } } },
    },
});

// ══════════════════════════════════════════════════════════════
// META TEMPLATES
// ══════════════════════════════════════════════════════════════

registry.registerPath({
    method: "get",
    path: "/meta-templates",
    tags: ["Meta Templates"],
    summary: "List registered Meta templates",
    description: "Returns all WhatsApp message templates registered with Meta for this Business Account.",
    security: authed,
    responses: {
        200: { description: "Template list", content: { "application/json": { schema: S.MetaTemplateListResponse } } },
    },
});

registry.registerPath({
    method: "post",
    path: "/meta-templates/register",
    tags: ["Meta Templates"],
    summary: "Register all templates with Meta",
    description: "Batch-registers all FitFlow message templates with Meta's WhatsApp API.",
    security: authed,
    responses: {
        200: { description: "Registration results", content: { "application/json": { schema: z.object({ summary: z.string(), results: z.array(z.any()) }) } } },
    },
});

// ══════════════════════════════════════════════════════════════
// COACH EXERCISES
// ══════════════════════════════════════════════════════════════

registry.registerPath({
    method: "post",
    path: "/coach-exercises/command",
    tags: ["Coach Exercises"],
    summary: "Process exercise command",
    description: "Parses a natural language exercise command and returns matching exercises for selection.",
    security: authed,
    request: {
        body: {
            content: {
                "application/json": {
                    schema: z.object({
                        input: z.string(),
                        clientIds: z.array(z.string().uuid()).optional(),
                    }),
                },
            },
        },
    },
    responses: {
        200: { description: "Command result", content: { "application/json": { schema: z.object({ type: z.string(), message: z.string().optional(), exercises: z.array(S.ExerciseResponse).optional() }) } } },
    },
});

// ══════════════════════════════════════════════════════════════
// WEBHOOKS (documented for external service configuration)
// ══════════════════════════════════════════════════════════════

registry.registerPath({
    method: "get",
    path: "/webhooks",
    tags: ["Webhooks"],
    summary: "WhatsApp webhook verification",
    description: "Meta sends a GET request with a challenge token during webhook registration. Returns the challenge if the verify token matches META_WHATSAPP_VERIFY_TOKEN.",
    request: {
        query: z.object({
            "hub.mode": z.string(),
            "hub.verify_token": z.string(),
            "hub.challenge": z.string(),
        }),
    },
    responses: {
        200: { description: "Challenge echoed back" },
        403: { description: "Invalid verify token" },
    },
});

registry.registerPath({
    method: "post",
    path: "/webhooks",
    tags: ["Webhooks"],
    summary: "WhatsApp inbound webhook",
    description: "Receives inbound messages, delivery statuses, and Flow responses from Meta's WhatsApp Cloud API. Signature verified via X-Hub-Signature-256 header using META_APP_SECRET. Always returns 200 immediately; processing is async.",
    responses: {
        200: { description: "Acknowledged" },
    },
});

registry.registerPath({
    method: "post",
    path: "/telegram/webhook",
    tags: ["Webhooks"],
    summary: "Telegram inbound webhook",
    description: "Receives messages and callback queries from Telegram Bot API. Verified via X-Telegram-Bot-Api-Secret-Token header matching TG_WEBHOOK_SECRET. Returns 200 immediately; processing is async.",
    responses: {
        200: { description: "Acknowledged" },
    },
});

registry.registerPath({
    method: "post",
    path: "/payments/webhook",
    tags: ["Webhooks"],
    summary: "Stripe payment webhook",
    description: "Handles checkout.session.completed events from Stripe. Uses express.raw() for signature verification with STRIPE_WEBHOOK_SECRET. Creates Payment record and transitions client PENDING_PAYMENT -> INTAKE_SENT.",
    responses: {
        200: { description: "Received", content: { "application/json": { schema: S.WebhookReceivedResponse } } },
        400: { description: "Invalid signature" },
    },
});

registry.registerPath({
    method: "post",
    path: "/subscriptions/webhook",
    tags: ["Webhooks"],
    summary: "Stripe subscription webhook",
    description: "Handles subscription lifecycle events: customer.subscription.created/updated/deleted, invoice.payment_succeeded/failed, customer.subscription.trial_will_end. Uses express.raw() with STRIPE_SUBSCRIPTION_WEBHOOK_SECRET.",
    responses: {
        200: { description: "Received", content: { "application/json": { schema: S.WebhookReceivedResponse } } },
        400: { description: "Invalid signature" },
    },
});
