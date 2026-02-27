import axios from "axios";
import { prisma } from "./prisma";
import { MessageChannel, MessageDirection } from "@prisma/client";

const WA_ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN;
const WA_PHONE_NUMBER_ID = process.env.META_WHATSAPP_PHONE_NUMBER_ID;

const IG_ACCESS_TOKEN = process.env.META_INSTAGRAM_PAGE_ACCESS_TOKEN || WA_ACCESS_TOKEN;
const IG_PAGE_ID = process.env.META_INSTAGRAM_PAGE_ID;

const VERSION = "v21.0";

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

