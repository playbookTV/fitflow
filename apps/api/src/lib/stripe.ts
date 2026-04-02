import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: "2025-02-24.acacia",
});

export const createCheckoutSession = async (
    clientId: string,
    coachId: string,
    successUrl: string,
    cancelUrl: string
) => {
    return await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
            {
                price_data: {
                    currency: "gbp",
                    product_data: {
                        name: "FitFlow Personal Training Subscription",
                        description: "Monthly coaching and workout plans",
                    },
                    unit_amount: 5000, // £50.00
                    recurring: {
                        interval: "month",
                    },
                },
                quantity: 1,
            },
        ],
        mode: "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
            clientId,
            coachId,
        },
        client_reference_id: clientId,
    });
};

export const verifyWebhook = (payload: string | Buffer, signature: string) => {
    return stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || ""
    );
};

export default stripe;
