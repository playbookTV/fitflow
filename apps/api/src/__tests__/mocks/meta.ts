import { vi } from "vitest";

const mockMessageResponse = { messages: [{ id: "wamid.test123" }] };

vi.mock("../../lib/meta", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../../lib/meta")>()),
    createFlow: vi.fn().mockResolvedValue({ id: "flow-123", name: "test-flow", status: "DRAFT", categories: ["OTHER"] }),
    uploadFlowJson: vi.fn().mockResolvedValue({ success: true }),
    publishFlow: vi.fn().mockResolvedValue({ success: true }),
    listFlows: vi.fn().mockResolvedValue([]),
    getFlow: vi.fn().mockResolvedValue({ id: "flow-123", name: "test-flow", status: "PUBLISHED" }),
    deleteFlow: vi.fn().mockResolvedValue({ success: true }),
    sendFlowMessage: vi.fn().mockResolvedValue(mockMessageResponse),
    sendCheckinFlow: vi.fn().mockResolvedValue(mockMessageResponse),
    sendWorkoutLogFlow: vi.fn().mockResolvedValue(mockMessageResponse),
    sendWhatsAppMessage: vi.fn().mockResolvedValue(mockMessageResponse),
    sendWhatsAppVideo: vi.fn().mockResolvedValue(mockMessageResponse),
    sendMessage: vi.fn().mockResolvedValue(mockMessageResponse),
}));
