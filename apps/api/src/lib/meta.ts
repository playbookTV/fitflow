import axios from "axios";
import { prisma } from "./prisma";
import { MessageChannel, MessageDirection } from "@prisma/client";

const WA_ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN;
const WA_PHONE_NUMBER_ID = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
const WA_BUSINESS_ACCOUNT_ID = process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID;

const VERSION = "v22.0";

// ═══════════════════════════════════════════════════════════════
// META API ERROR HANDLING
// ═══════════════════════════════════════════════════════════════

/** Error codes from Meta Cloud API that we handle specifically. */
export const MetaErrorCode = {
    /** Message sent outside the 24-hour customer service window without an approved template. */
    REENGAGEMENT_MESSAGE: 131047,
    /** Rate limit hit. */
    RATE_LIMIT: 130429,
    /** Recipient phone number not on WhatsApp. */
    RECIPIENT_NOT_ON_WHATSAPP: 131026,
    /** Template name does not exist or has no approved translation for the requested language. */
    TEMPLATE_NOT_FOUND: 132001,
} as const;

/**
 * Structured error thrown when the Meta Cloud API returns an error response.
 * Preserves the numeric error code so callers can branch on specific failures.
 */
export class MetaApiError extends Error {
    constructor(
        message: string,
        public readonly code: number,
        public readonly subcode?: number,
        public readonly fbtraceId?: string,
    ) {
        super(message);
        this.name = "MetaApiError";
    }

    /** True when the 24-hour customer service window has closed for this recipient. */
    get isWindowClosed(): boolean {
        return this.code === MetaErrorCode.REENGAGEMENT_MESSAGE;
    }

    static fromAxiosError(error: any): MetaApiError | null {
        const data = error?.response?.data?.error;
        if (!data?.code) return null;
        return new MetaApiError(
            data.message || data.error_user_msg || error.message,
            data.code,
            data.error_subcode,
            data.fbtrace_id,
        );
    }
}

// ═══════════════════════════════════════════════════════════════
// WHATSAPP FLOWS API
// ═══════════════════════════════════════════════════════════════

export interface FlowInfo {
    id: string;
    name: string;
    status: "DRAFT" | "PUBLISHED" | "DEPRECATED" | "BLOCKED" | "THROTTLED";
    categories: string[];
}

/**
 * Create a new WhatsApp Flow
 */
export const createFlow = async (name: string, categories: string[] = ["OTHER"]): Promise<FlowInfo> => {
    if (!WA_ACCESS_TOKEN || !WA_BUSINESS_ACCOUNT_ID) {
        throw new Error("WhatsApp API configuration missing");
    }

    const url = `https://graph.facebook.com/${VERSION}/${WA_BUSINESS_ACCOUNT_ID}/flows`;

    try {
        const response = await axios.post(url, {
            name,
            categories,
        }, {
            headers: { Authorization: `Bearer ${WA_ACCESS_TOKEN}` },
        });

        return response.data;
    } catch (error: any) {
        console.error("[Flows API Error] createFlow:", error.response?.data || error.message);
        throw error;
    }
};

/**
 * Upload Flow JSON to a flow
 */
export const uploadFlowJson = async (flowId: string, flowJson: object): Promise<any> => {
    if (!WA_ACCESS_TOKEN) {
        throw new Error("WhatsApp API configuration missing");
    }

    const url = `https://graph.facebook.com/${VERSION}/${flowId}/assets`;

    try {
        const response = await axios.post(url, {
            name: "flow.json",
            asset_type: "FLOW_JSON",
            file: JSON.stringify(flowJson),
        }, {
            headers: { Authorization: `Bearer ${WA_ACCESS_TOKEN}` },
        });

        return response.data;
    } catch (error: any) {
        console.error("[Flows API Error] uploadFlowJson:", error.response?.data || error.message);
        throw error;
    }
};

/**
 * Publish a Flow (makes it available for sending)
 */
export const publishFlow = async (flowId: string): Promise<any> => {
    if (!WA_ACCESS_TOKEN) {
        throw new Error("WhatsApp API configuration missing");
    }

    const url = `https://graph.facebook.com/${VERSION}/${flowId}/publish`;

    try {
        const response = await axios.post(url, {}, {
            headers: { Authorization: `Bearer ${WA_ACCESS_TOKEN}` },
        });

        return response.data;
    } catch (error: any) {
        console.error("[Flows API Error] publishFlow:", error.response?.data || error.message);
        throw error;
    }
};

/**
 * Get all Flows for the business account
 */
export const listFlows = async (): Promise<FlowInfo[]> => {
    if (!WA_ACCESS_TOKEN || !WA_BUSINESS_ACCOUNT_ID) {
        throw new Error("WhatsApp API configuration missing");
    }

    const url = `https://graph.facebook.com/${VERSION}/${WA_BUSINESS_ACCOUNT_ID}/flows`;

    try {
        const response = await axios.get(url, {
            headers: { Authorization: `Bearer ${WA_ACCESS_TOKEN}` },
        });

        return response.data.data || [];
    } catch (error: any) {
        console.error("[Flows API Error] listFlows:", error.response?.data || error.message);
        throw error;
    }
};

/**
 * Get Flow details by ID
 */
export const getFlow = async (flowId: string): Promise<any> => {
    if (!WA_ACCESS_TOKEN) {
        throw new Error("WhatsApp API configuration missing");
    }

    const url = `https://graph.facebook.com/${VERSION}/${flowId}?fields=id,name,status,categories,validation_errors`;

    try {
        const response = await axios.get(url, {
            headers: { Authorization: `Bearer ${WA_ACCESS_TOKEN}` },
        });

        return response.data;
    } catch (error: any) {
        console.error("[Flows API Error] getFlow:", error.response?.data || error.message);
        throw error;
    }
};

/**
 * Delete a Flow
 */
export const deleteFlow = async (flowId: string): Promise<any> => {
    if (!WA_ACCESS_TOKEN) {
        throw new Error("WhatsApp API configuration missing");
    }

    const url = `https://graph.facebook.com/${VERSION}/${flowId}`;

    try {
        const response = await axios.delete(url, {
            headers: { Authorization: `Bearer ${WA_ACCESS_TOKEN}` },
        });

        return response.data;
    } catch (error: any) {
        console.error("[Flows API Error] deleteFlow:", error.response?.data || error.message);
        throw error;
    }
};

/**
 * Send a WhatsApp Flow message to a user
 */
interface FlowMessageParams {
    to: string;
    flowId: string;
    flowToken: string;
    headerText: string;
    bodyText: string;
    footerText: string;
    ctaText: string;
    firstScreenId?: string;
    clientId?: string;
    mode?: "draft" | "published";
}

export const sendFlowMessage = async ({
    to,
    flowId,
    flowToken,
    headerText,
    bodyText,
    footerText,
    ctaText,
    firstScreenId = "WEIGHT",
    clientId,
    mode = "published",
}: FlowMessageParams): Promise<any> => {
    if (!WA_ACCESS_TOKEN || !WA_PHONE_NUMBER_ID) {
        throw new Error("WhatsApp API configuration missing");
    }

    const cleanTo = to.replaceAll(/\D/g, "");
    const url = `https://graph.facebook.com/${VERSION}/${WA_PHONE_NUMBER_ID}/messages`;

    const data = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanTo,
        type: "interactive",
        interactive: {
            type: "flow",
            header: {
                type: "text",
                text: headerText,
            },
            body: {
                text: bodyText,
            },
            footer: {
                text: footerText,
            },
            action: {
                name: "flow",
                parameters: {
                    flow_message_version: "3",
                    flow_token: flowToken,
                    flow_id: flowId,
                    flow_cta: ctaText,
                    flow_action: "navigate",
                    flow_action_payload: {
                        screen: firstScreenId,
                    },
                    mode: mode,
                },
            },
        },
    };

    try {
        const response = await axios.post(url, data, {
            headers: { Authorization: `Bearer ${WA_ACCESS_TOKEN}` },
        });

        const result = response.data;

        if (clientId && result.messages?.[0]?.id) {
            await prisma.message.create({
                data: {
                    clientId,
                    channel: MessageChannel.WHATSAPP,
                    direction: MessageDirection.OUTBOUND,
                    content: `[Flow: ${flowToken}] ${bodyText}`,
                    metaMessageId: result.messages[0].id,
                    status: "sent",
                },
            });
        }

        return result;
    } catch (error: any) {
        console.error("[WA Flow API Error]", error.response?.data || error.message);
        throw error;
    }
};

/**
 * Send Weekly Check-in Flow
 */
export const sendCheckinFlow = async (
    to: string,
    flowId: string,
    clientId?: string,
    mode: "draft" | "published" = "published"
): Promise<any> => {
    const flowToken = `checkin_${clientId || "unknown"}_${Date.now()}`;

    return sendFlowMessage({
        to,
        flowId,
        flowToken,
        headerText: "Weekly Check-in",
        bodyText: "Hey! It's time for your weekly check-in. This helps your coach track your progress.",
        footerText: "Takes less than 1 minute",
        ctaText: "Start Check-in",
        firstScreenId: "WEIGHT",
        clientId,
        mode,
    });
};

/**
 * Send Workout Log Flow
 */
export const sendWorkoutLogFlow = async (
    to: string,
    flowId: string,
    clientId?: string,
    mode: "draft" | "published" = "published"
): Promise<any> => {
    const flowToken = `workout_${clientId || "unknown"}_${Date.now()}`;

    return sendFlowMessage({
        to,
        flowId,
        flowToken,
        headerText: "Log Your Workout",
        bodyText: "Great job finishing your workout! Let's log how it went.",
        footerText: "Quick 30-second log",
        ctaText: "Log Workout",
        firstScreenId: "STATUS",
        clientId,
        mode,
    });
};

/**
 * Sends a WhatsApp message using Meta's Cloud API Direct.
 */
export const sendWhatsAppMessage = async (to: string, bodyOrTemplate: string | object, clientId?: string) => {
    if (!WA_ACCESS_TOKEN || !WA_PHONE_NUMBER_ID) {
        throw new Error("WhatsApp API configuration missing");
    }

    const cleanTo = to.replaceAll(/\D/g, "");
    const url = `https://graph.facebook.com/${VERSION}/${WA_PHONE_NUMBER_ID}/messages`;

    const data: any = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanTo,
    };

    if (typeof bodyOrTemplate === "string") {
        data.type = "text";
        data.text = { preview_url: false, body: bodyOrTemplate };
    } else {
        data.type = "template";
        data.template = bodyOrTemplate;
    }

    const content = typeof bodyOrTemplate === "string" ? bodyOrTemplate : JSON.stringify(bodyOrTemplate);

    try {
        const response = await axios.post(url, data, {
            headers: { Authorization: `Bearer ${WA_ACCESS_TOKEN}` },
        });

        const result = response.data;

        if (clientId && result.messages?.[0]?.id) {
            await prisma.message.create({
                data: {
                    clientId,
                    channel: MessageChannel.WHATSAPP,
                    direction: MessageDirection.OUTBOUND,
                    content,
                    metaMessageId: result.messages[0].id,
                    status: "sent",
                },
            });
        }

        return result;
    } catch (error: any) {
        console.error("[WA API Error]", error.response?.data || error.message);

        // Record the failed message so it's visible in the conversation history
        if (clientId) {
            const metaError = MetaApiError.fromAxiosError(error);
            const errorDetail = metaError
                ? `[FAILED:${metaError.code}] ${metaError.message}`
                : `[FAILED] ${error.message}`;
            await prisma.message.create({
                data: {
                    clientId,
                    channel: MessageChannel.WHATSAPP,
                    direction: MessageDirection.OUTBOUND,
                    content: `${errorDetail}\n---\n${content}`,
                    status: "failed",
                },
            }).catch((dbErr) => console.error("[WA API] Failed to record failed message:", dbErr));
        }

        // Throw a structured MetaApiError when possible so callers can branch on error code
        const metaError = MetaApiError.fromAxiosError(error);
        if (metaError) throw metaError;
        throw error;
    }
};

/**
 * Sends a video message via WhatsApp Cloud API.
 */
export const sendWhatsAppVideo = async (
    to: string,
    videoUrl: string,
    caption: string,
    clientId?: string
) => {
    if (!WA_ACCESS_TOKEN || !WA_PHONE_NUMBER_ID) {
        throw new Error("WhatsApp API configuration missing");
    }

    const cleanTo = to.replaceAll(/\D/g, "");
    const url = `https://graph.facebook.com/${VERSION}/${WA_PHONE_NUMBER_ID}/messages`;

    const data = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanTo,
        type: "video",
        video: { link: videoUrl, caption },
    };

    try {
        const response = await axios.post(url, data, {
            headers: { Authorization: `Bearer ${WA_ACCESS_TOKEN}` },
        });

        const result = response.data;

        if (clientId && result.messages?.[0]?.id) {
            await prisma.message.create({
                data: {
                    clientId,
                    channel: MessageChannel.WHATSAPP,
                    direction: MessageDirection.OUTBOUND,
                    content: `[Video] ${caption}`,
                    metaMessageId: result.messages[0].id,
                    status: "sent",
                },
            });
        }

        return result;
    } catch (error: any) {
        console.error("[WA API Error] sendVideo:", error.response?.data || error.message);
        throw error;
    }
};

/**
 * Generalized sender based on channel.
 * Currently only supports WhatsApp. Telegram will be added via the channel abstraction layer.
 */
export const sendMessage = async (channel: MessageChannel, to: string, content: string | object, clientId?: string) => {
    if (channel === MessageChannel.WHATSAPP) {
        return sendWhatsAppMessage(to, content, clientId);
    }

    throw new Error(`Unsupported channel: ${channel}`);
};

