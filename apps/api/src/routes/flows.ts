import { Router } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import {
    createFlow,
    uploadFlowJson,
    publishFlow,
    listFlows,
    getFlow,
    deleteFlow,
    sendCheckinFlow,
    sendWorkoutLogFlow,
} from "../lib/meta";
import { prisma } from "../lib/prisma";

// Import flow JSON schemas
import weeklyCheckinFlow from "../flows/weekly-checkin.json";
import workoutLogFlow from "../flows/workout-log.json";

const router: Router = Router();

// Flow type to JSON mapping
const FLOW_SCHEMAS: Record<string, object> = {
    weekly_checkin: weeklyCheckinFlow,
    workout_log: workoutLogFlow,
};

// ═══════════════════════════════════════════════════════════════
// FLOW MANAGEMENT ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /flows - List all flows
 */
router.get("/", authenticate, async (_req: AuthRequest, res) => {
    try {
        const flows = await listFlows();
        res.json({ flows });
    } catch (error: any) {
        console.error("Error listing flows:", error);
        res.status(500).json({ error: error.message || "Failed to list flows" });
    }
});

/**
 * GET /flows/:flowId - Get flow details
 */
router.get("/:flowId", authenticate, async (req: AuthRequest, res) => {
    const flowId = req.params.flowId as string;
    try {
        const flow = await getFlow(flowId);
        res.json(flow);
    } catch (error: any) {
        console.error("Error getting flow:", error);
        res.status(500).json({ error: error.message || "Failed to get flow" });
    }
});

/**
 * POST /flows/create - Create a new flow
 * Body: { name: string, type: "weekly_checkin" | "workout_log" }
 */
router.post("/create", authenticate, async (req: AuthRequest, res) => {
    const { name, type } = req.body;

    if (!name || !type) {
        return res.status(400).json({ error: "name and type are required" });
    }

    const flowJson = FLOW_SCHEMAS[type];
    if (!flowJson) {
        return res.status(400).json({ error: `Invalid flow type: ${type}. Valid types: ${Object.keys(FLOW_SCHEMAS).join(", ")}` });
    }

    try {
        // 1. Create the flow
        const flow = await createFlow(name, ["OTHER"]);
        console.log(`[Flows] Created flow: ${flow.id}`);

        // 2. Upload the JSON schema
        await uploadFlowJson(flow.id, flowJson);
        console.log(`[Flows] Uploaded JSON to flow: ${flow.id}`);

        res.json({
            success: true,
            flow: {
                id: flow.id,
                name,
                type,
                status: "DRAFT",
            },
            message: "Flow created. Use POST /flows/:flowId/publish to publish it.",
        });
    } catch (error: any) {
        console.error("Error creating flow:", error);
        res.status(500).json({ error: error.response?.data?.error?.message || error.message || "Failed to create flow" });
    }
});

/**
 * POST /flows/:flowId/publish - Publish a flow
 */
router.post("/:flowId/publish", authenticate, async (req: AuthRequest, res) => {
    const flowId = req.params.flowId as string;
    try {
        await publishFlow(flowId);
        res.json({ success: true, message: "Flow published successfully" });
    } catch (error: any) {
        console.error("Error publishing flow:", error);
        res.status(500).json({ error: error.response?.data?.error?.message || error.message || "Failed to publish flow" });
    }
});

/**
 * DELETE /flows/:flowId - Delete a flow
 */
router.delete("/:flowId", authenticate, async (req: AuthRequest, res) => {
    const flowId = req.params.flowId as string;
    try {
        await deleteFlow(flowId);
        res.json({ success: true, message: "Flow deleted successfully" });
    } catch (error: any) {
        console.error("Error deleting flow:", error);
        res.status(500).json({ error: error.response?.data?.error?.message || error.message || "Failed to delete flow" });
    }
});

// ═══════════════════════════════════════════════════════════════
// SEND FLOW ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * POST /flows/send/checkin - Send a check-in flow to a client
 * Body: { clientId: string, flowId: string, mode?: "draft" | "published" }
 */
router.post("/send/checkin", authenticate, async (req: AuthRequest, res) => {
    const coachId = req.user?.id;
    const { clientId, flowId, mode = "published" } = req.body;

    if (!clientId || !flowId) {
        return res.status(400).json({ error: "clientId and flowId are required" });
    }

    try {
        const client = await prisma.client.findFirst({
            where: { id: clientId, coachId },
        });

        if (!client) {
            return res.status(404).json({ error: "Client not found" });
        }

        if (!client.phone) {
            return res.status(400).json({ error: "Client has no phone number for WhatsApp Flow" });
        }

        const result = await sendCheckinFlow(client.phone, flowId, clientId, mode);
        res.json({ success: true, messageId: result.messages?.[0]?.id });
    } catch (error: any) {
        console.error("Error sending check-in flow:", error);
        res.status(500).json({ error: error.response?.data?.error?.message || error.message || "Failed to send flow" });
    }
});

/**
 * POST /flows/send/workout - Send a workout log flow to a client
 * Body: { clientId: string, flowId: string, mode?: "draft" | "published" }
 */
router.post("/send/workout", authenticate, async (req: AuthRequest, res) => {
    const coachId = req.user?.id;
    const { clientId, flowId, mode = "published" } = req.body;

    if (!clientId || !flowId) {
        return res.status(400).json({ error: "clientId and flowId are required" });
    }

    try {
        const client = await prisma.client.findFirst({
            where: { id: clientId, coachId },
        });

        if (!client) {
            return res.status(404).json({ error: "Client not found" });
        }

        if (!client.phone) {
            return res.status(400).json({ error: "Client has no phone number for WhatsApp Flow" });
        }

        const result = await sendWorkoutLogFlow(client.phone, flowId, clientId, mode);
        res.json({ success: true, messageId: result.messages?.[0]?.id });
    } catch (error: any) {
        console.error("Error sending workout flow:", error);
        res.status(500).json({ error: error.response?.data?.error?.message || error.message || "Failed to send flow" });
    }
});

/**
 * POST /flows/test - Test a flow by sending to a phone number directly
 * Body: { phone: string, flowId: string, type: "checkin" | "workout", mode?: "draft" | "published" }
 */
router.post("/test", authenticate, async (req: AuthRequest, res) => {
    const { phone, flowId, type, mode = "draft" } = req.body;

    if (!phone || !flowId || !type) {
        return res.status(400).json({ error: "phone, flowId, and type are required" });
    }

    try {
        let result;
        if (type === "checkin") {
            result = await sendCheckinFlow(phone, flowId, undefined, mode);
        } else if (type === "workout") {
            result = await sendWorkoutLogFlow(phone, flowId, undefined, mode);
        } else {
            return res.status(400).json({ error: "type must be 'checkin' or 'workout'" });
        }

        res.json({ success: true, messageId: result.messages?.[0]?.id });
    } catch (error: any) {
        console.error("Error testing flow:", error);
        res.status(500).json({ error: error.response?.data?.error?.message || error.message || "Failed to send test flow" });
    }
});

export default router;
