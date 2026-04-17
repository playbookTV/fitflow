import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PricingTiers } from "../PricingTiers";

// Mock auth module
vi.mock("@/lib/auth", () => ({
    getAuthHeaders: vi.fn().mockResolvedValue({ Authorization: "Bearer test" }),
}));

afterEach(() => cleanup());

const mockTiers = [
    {
        tier: "STARTER",
        limits: {
            maxClients: 10,
            maxChannels: 1,
            maxBots: 1,
            analytics: false,
            paymentCollection: false,
            checkinSequences: false,
            whiteLabel: false,
        },
        pricing: { monthly: 1900, annual: 1500 },
        currency: "usd",
    },
    {
        tier: "PRO",
        limits: {
            maxClients: 30,
            maxChannels: 2,
            maxBots: -1,
            analytics: true,
            paymentCollection: true,
            checkinSequences: true,
            whiteLabel: false,
        },
        pricing: { monthly: 4900, annual: 3900 },
        currency: "usd",
    },
    {
        tier: "STUDIO",
        limits: {
            maxClients: 75,
            maxChannels: 2,
            maxBots: -1,
            analytics: true,
            paymentCollection: true,
            checkinSequences: true,
            whiteLabel: true,
        },
        pricing: { monthly: 9900, annual: 7900 },
        currency: "usd",
    },
];

describe("PricingTiers", () => {
    it("renders all three tiers", () => {
        render(<PricingTiers tiers={mockTiers} />);

        expect(screen.getByText("Starter")).toBeInTheDocument();
        expect(screen.getByText("Pro")).toBeInTheDocument();
        expect(screen.getByText("Studio")).toBeInTheDocument();
    });

    it("displays monthly pricing by default", () => {
        render(<PricingTiers tiers={mockTiers} />);

        // Each price appears once per tier
        expect(screen.getAllByText("$19")).toHaveLength(1);
        expect(screen.getAllByText("$49")).toHaveLength(1);
        expect(screen.getAllByText("$99")).toHaveLength(1);
    });

    it("switches to annual pricing when clicked", async () => {
        const user = userEvent.setup();
        render(<PricingTiers tiers={mockTiers} />);

        await user.click(screen.getByRole("button", { name: /annual/i }));

        expect(screen.getAllByText("$15")).toHaveLength(1);
        expect(screen.getAllByText("$39")).toHaveLength(1);
        expect(screen.getAllByText("$79")).toHaveLength(1);
    });

    it("shows 'Most Popular' badge on Pro tier", () => {
        render(<PricingTiers tiers={mockTiers} />);
        expect(screen.getAllByText("Most Popular")).toHaveLength(1);
    });

    it("shows client limits for each tier", () => {
        render(<PricingTiers tiers={mockTiers} />);

        expect(screen.getByText(/up to 10 clients/)).toBeInTheDocument();
        expect(screen.getByText(/up to 30 clients/)).toBeInTheDocument();
        expect(screen.getByText(/up to 75 clients/)).toBeInTheDocument();
    });

    it("shows 'Current Plan' button for current tier", () => {
        render(<PricingTiers tiers={mockTiers} currentTier="PRO" />);

        expect(screen.getByText("Current Plan")).toBeInTheDocument();
        const switchButtons = screen.getAllByText("Switch Plan");
        expect(switchButtons).toHaveLength(2);
    });

    it("shows 'Start 7-Day Trial' when no current tier", () => {
        render(<PricingTiers tiers={mockTiers} />);

        const trialButtons = screen.getAllByText("Start 7-Day Trial");
        expect(trialButtons).toHaveLength(3);
    });

    it("renders feature lists", () => {
        render(<PricingTiers tiers={mockTiers} />);

        expect(screen.getByText("Up to 10 clients")).toBeInTheDocument();
        expect(screen.getByText("Stripe payment collection")).toBeInTheDocument();
        expect(screen.getByText("White-label client experience")).toBeInTheDocument();
    });
});
