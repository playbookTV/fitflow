import { PrismaClient } from "@prisma/client";

/**
 * Tenant isolation guard.
 *
 * FitFlow is multi-tenant — every Coach is a tenant that owns Clients,
 * Payments, Plans, etc. Because the API uses the Supabase service-role key
 * (RLS bypassed), tenant isolation depends entirely on app-level filtering.
 * This Prisma extension flags queries on tenant-owned models that omit a
 * coach scope, so the bug class becomes hard to write by accident.
 *
 * Phase 1 (current): WARN ONLY — log to stderr/PostHog so we can flush out
 *                   every legitimate cross-tenant query path.
 * Phase 2 (later):   THROW — flip the env flag PRISMA_TENANT_GUARD=throw to
 *                   make unscoped tenant queries an error.
 *
 * Escape hatch: pass `__unsafeGlobal: true` in the args.where to whitelist
 * a query that legitimately needs to span tenants (e.g. webhook lookups by
 * external ID, the auth middleware bootstrapping the Coach record).
 */

// Models whose rows are owned by a single Coach. Queries on these MUST scope
// by coachId either directly (where.coachId) or via a relation (where.client.coachId).
const TENANT_MODELS = new Set<string>([
    "Client",
    "Lead",
    "WorkoutPlan",
    "WorkoutDay",
    "WorkoutExercise",
    "PlanAssignment",
    "MealPlan",
    "MealDay",
    "MealEntry",
    "MealAssignment",
    "MealLog",
    "WorkoutLog",
    "CheckIn",
    "Payment",
    "Message",
    "Offer",
    "ShortLink",
    "ProfileEvent",
    "ClientRiskScore",
    "SessionBlock",
    "BotRegistry",
    "SlugRedirect",
    // EventLog is *queried* without coachId in admin/analytics contexts; intentionally excluded.
    // Subscription is keyed 1:1 on coachId via @unique; @@unique({coachId}) lookup counts as scoped.
]);

// Operations whose where clause must be checked.
const GUARDED_OPS = new Set<string>([
    "findUnique",
    "findUniqueOrThrow",
    "findFirst",
    "findFirstOrThrow",
    "findMany",
    "update",
    "updateMany",
    "delete",
    "deleteMany",
    "count",
    "aggregate",
    "groupBy",
]);

/**
 * Heuristic: does the where clause scope by coachId, either directly or
 * through a relation? Conservative — we err on the side of *not* warning
 * about scoped queries (false negatives), since warn-mode noise is what
 * stops us from flipping to throw mode.
 */
function isCoachScoped(where: unknown): boolean {
    if (!where || typeof where !== "object") return false;
    const w = where as Record<string, unknown>;

    // Escape hatch — explicit opt-out for known cross-tenant lookups.
    if (w.__unsafeGlobal === true) return true;

    // Direct: { coachId: "..." }
    if (w.coachId != null) return true;

    // Direct relation to Coach. Any non-empty filter on `coach` scopes to a
    // single tenant (coach.id is the tenant root).
    if (w.coach && typeof w.coach === "object" && Object.keys(w.coach).length > 0) {
        return true;
    }

    // Indirection through a tenant-owned parent. Recurse — `client: {}` alone
    // is NOT a scope; we need `client: { coachId }` or deeper.
    const tenantParents = [
        "client",
        "lead",
        "plan",
        "assignment",
        "mealPlan",
        "mealAssignment",
        "planAssignment",
        "offer",
    ] as const;
    for (const key of tenantParents) {
        const child = w[key];
        if (child && typeof child === "object" && isCoachScoped(child)) return true;
    }

    // AND/OR — require ALL branches scoped so an attacker can't slip an OR
    // with an unscoped clause past the guard.
    if (Array.isArray(w.AND) && w.AND.length > 0 && w.AND.every(isCoachScoped)) return true;
    if (Array.isArray(w.OR) && w.OR.length > 0 && w.OR.every(isCoachScoped)) return true;

    return false;
}

/**
 * Strip the escape-hatch flag before passing args to Prisma so it doesn't
 * trip Prisma's strict where validation.
 */
function stripGuardFlags(args: unknown): unknown {
    if (!args || typeof args !== "object") return args;
    const a = args as Record<string, unknown>;
    if (!a.where || typeof a.where !== "object") return args;
    const where = a.where as Record<string, unknown>;
    if (where.__unsafeGlobal === undefined) return args;
    const { __unsafeGlobal: _drop, ...rest } = where;
    return { ...a, where: rest };
}

const guardMode = process.env.PRISMA_TENANT_GUARD ?? "warn"; // "warn" | "throw" | "off"

const base = new PrismaClient();

const extended = base.$extends({
    name: "tenant-guard",
    query: {
        $allModels: {
            async $allOperations({ model, operation, args, query }) {
                if (
                    guardMode !== "off"
                    && model
                    && TENANT_MODELS.has(model)
                    && GUARDED_OPS.has(operation)
                ) {
                    const where = (args as { where?: unknown })?.where;
                    if (!isCoachScoped(where)) {
                        const message = `[TenantGuard] ${model}.${operation} called without coachId scope`;
                        if (guardMode === "throw") {
                            throw new Error(
                                `${message}. Use findFirst({ where: { id, coachId } }), scope through a relation (e.g. { client: { coachId } }), or pass { __unsafeGlobal: true } in where to opt out.`
                            );
                        }
                        // warn mode — log so the call site can be triaged
                        console.warn(message, {
                            stack: new Error("tenant-guard trace").stack?.split("\n").slice(2, 6).join("\n"),
                        });
                    }
                }
                return query(stripGuardFlags(args) as never);
            },
        },
    },
});

const globalForPrisma = globalThis as unknown as { prisma: typeof extended };

export const prisma: typeof extended = globalForPrisma.prisma || extended;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
