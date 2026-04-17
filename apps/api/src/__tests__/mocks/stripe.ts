import { vi } from "vitest";

vi.mock("../../lib/stripe", () => ({
    createCheckoutSession: vi.fn().mockResolvedValue({ id: "cs_test_123", url: "https://checkout.stripe.com/test" }),
    createConnectAccount: vi.fn().mockResolvedValue({ id: "acct_test_123" }),
    createAccountLink: vi.fn().mockResolvedValue({ url: "https://connect.stripe.com/setup/test" }),
    createLoginLink: vi.fn().mockResolvedValue({ url: "https://dashboard.stripe.com/test" }),
    verifyWebhook: vi.fn().mockReturnValue({ id: "evt_test_123", type: "checkout.session.completed" }),
    createStripeCustomer: vi.fn().mockResolvedValue({ id: "cus_test_123" }),
    createSubscriptionCheckout: vi.fn().mockResolvedValue({ id: "cs_sub_test_123", url: "https://checkout.stripe.com/sub/test" }),
    createCustomerPortalSession: vi.fn().mockResolvedValue({ url: "https://billing.stripe.com/test" }),
    verifySubscriptionWebhook: vi.fn().mockReturnValue({ id: "evt_sub_test_123", type: "customer.subscription.created" }),
}));
