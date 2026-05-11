/**
 * Grants a comp STUDIO subscription to a coach by email so they can test all features.
 * No Stripe interaction — uses synthetic IDs prefixed with `manual_comp_`.
 *
 * Usage:
 *   pnpm --filter @fitflow/api exec tsx scripts/grant-comp-subscription.ts <email> [tier] [days]
 *
 * Defaults: tier=STUDIO, days=365
 */

import { prisma } from "../src/lib/prisma";

type Tier = "STARTER" | "PRO" | "STUDIO";

async function main() {
    const [email, tierArg, daysArg] = process.argv.slice(2);
    if (!email) {
        console.error("Usage: tsx scripts/grant-comp-subscription.ts <email> [tier] [days]");
        process.exit(1);
    }

    const tier = (tierArg ?? "STUDIO").toUpperCase() as Tier;
    if (!["STARTER", "PRO", "STUDIO"].includes(tier)) {
        console.error(`Invalid tier "${tier}". Must be STARTER, PRO, or STUDIO.`);
        process.exit(1);
    }

    const days = daysArg ? parseInt(daysArg, 10) : 365;
    if (!Number.isFinite(days) || days <= 0) {
        console.error(`Invalid days "${daysArg}".`);
        process.exit(1);
    }

    const coach = await prisma.coach.findUnique({
        where: { email },
        include: { subscription: true },
    });

    if (!coach) {
        console.error(`No coach found for ${email}`);
        process.exit(1);
    }

    const now = new Date();
    const periodEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const stripeSubscriptionId = `manual_comp_${coach.id}`;
    const stripePriceId = `manual_comp_${tier.toLowerCase()}`;

    const sub = await prisma.subscription.upsert({
        where: { coachId: coach.id },
        create: {
            coachId: coach.id,
            stripeSubscriptionId,
            stripePriceId,
            tier,
            billingInterval: "ANNUAL",
            status: "ACTIVE",
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
        },
        update: {
            tier,
            status: "ACTIVE",
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
            stripeSubscriptionId,
            stripePriceId,
        },
    });

    console.log(`Granted ${tier} subscription to ${email} (coach ${coach.id})`);
    console.log(`  status=${sub.status} period=${sub.currentPeriodStart.toISOString()} → ${sub.currentPeriodEnd.toISOString()}`);
}

main()
    .catch((err) => {
        console.error(err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
