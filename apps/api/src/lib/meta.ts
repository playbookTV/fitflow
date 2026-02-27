import axios from "axios";
import { prisma } from "./prisma";
import { MessageChannel, MessageDirection } from "@prisma/client";

const WA_ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN;
const WA_PHONE_NUMBER_ID = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
const WA_BUSINESS_ACCOUNT_ID = process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID;

const IG_ACCESS_TOKEN = process.env.META_INSTAGRAM_PAGE_ACCESS_TOKEN || WA_ACCESS_TOKEN;
const IG_PAGE_ID = process.env.META_INSTAGRAM_PAGE_ID;

const VERSION = "v22.0";

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
export const sendFlowMessage = async (
    to: string,
    flowId: string,
    flowToken: string,
    headerText: string,
    bodyText: string,
    footerText: string,
    ctaText: string,
    firstScreenId: string = "WEIGHT",
    clientId?: string,
    mode: "draft" | "published" = "published"
): Promise<any> => {
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

    return sendFlowMessage(
        to,
        flowId,
        flowToken,
        "Weekly Check-in",
        "Hey! It's time for your weekly check-in. This helps your trainer track your progress.",
        "Takes less than 1 minute",
        "Start Check-in",
        "WEIGHT",
        clientId,
        mode
    );
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

    return sendFlowMessage(
        to,
        flowId,
        flowToken,
        "Log Your Workout",
        "Great job finishing your workout! Let's log how it went.",
        "Quick 30-second log",
        "Log Workout",
        "STATUS",
        clientId,
        mode
    );
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
                    content: typeof bodyOrTemplate === "string" ? bodyOrTemplate : JSON.stringify(bodyOrTemplate),
                    metaMessageId: result.messages[0].id,
                    status: "sent",
                },
            });
        }

        return result;
    } catch (error: any) {
        console.error("[WA API Error]", error.response?.data || error.message);
        throw error;
    }
};

/**
 * Sends an Instagram DM.
 */
export const sendInstagramMessage = async (recipientId: string, text: string, clientId?: string) => {
    if (!IG_ACCESS_TOKEN) throw new Error("Instagram API configuration missing");

    const url = `https://graph.facebook.com/${VERSION}/me/messages`;

    const data = {
        recipient: { id: recipientId },
        message: { text },
    };

    try {
        const response = await axios.post(url, data, {
            headers: { Authorization: `Bearer ${IG_ACCESS_TOKEN}` },
        });

        const result = response.data;

        if (clientId && result.message_id) {
            await prisma.message.create({
                data: {
                    clientId,
                    channel: MessageChannel.INSTAGRAM,
                    direction: MessageDirection.OUTBOUND,
                    content: text,
                    metaMessageId: result.message_id,
                    status: "sent",
                },
            });
        }

        return result;
    } catch (error: any) {
        console.error("[IG API Error]", error.response?.data || error.message);
        throw error;
    }
};

/**
 * Sends an Instagram Quick Reply.
 */
export const sendInstagramQuickReplies = async (recipientId: string, text: string, quickReplies: { title: string, payload: string }[], clientId?: string) => {
    if (!IG_ACCESS_TOKEN) throw new Error("Instagram API configuration missing");

    const url = `https://graph.facebook.com/${VERSION}/me/messages`;

    const data = {
        recipient: { id: recipientId },
        message: {
            text,
            quick_replies: quickReplies.map(qr => ({
                content_type: "text",
                title: qr.title,
                payload: qr.payload,
            })),
        },
    };

    try {
        const response = await axios.post(url, data, {
            headers: { Authorization: `Bearer ${IG_ACCESS_TOKEN}` },
        });

        const result = response.data;

        if (clientId && result.message_id) {
            await prisma.message.create({
                data: {
                    clientId,
                    channel: MessageChannel.INSTAGRAM,
                    direction: MessageDirection.OUTBOUND,
                    content: text,
                    metaMessageId: result.message_id,
                    status: "sent",
                },
            });
        }

        return result;
    } catch (error: any) {
        console.error("[IG API QuickReply Error]", error.response?.data || error.message);
        throw error;
    }
};

/**
 * Generalized sender based on channel.
 */
export const sendMessage = async (channel: MessageChannel, to: string, content: string | any, clientId?: string) => {
    if (channel === MessageChannel.WHATSAPP) {
        return sendWhatsAppMessage(to, content, clientId);
    } else {
        return sendInstagramMessage(to, content, clientId);
    }
};

