import { beforeEach, vi } from "vitest";
import dotenv from "dotenv";
import path from "path";

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, "../../.env.test") });

// Ensure test environment
process.env.NODE_ENV = "test";
process.env.ENABLE_BACKGROUND_JOBS = "false";
process.env.ENABLE_SCHEDULERS = "false";
process.env.ENABLE_WORKERS = "false";

// Import all mocks — order matters (prisma first since others may depend on it)
import "./mocks/prisma";
import "./mocks/queue";
import "./mocks/meta";
import "./mocks/stripe";
import "./mocks/auth";
import "./mocks/telegram";

// Mock additional modules
vi.mock("../handlers/coachCommandRouter", () => ({
    routeCoachCommand: vi.fn().mockResolvedValue(null),
}));

// Silence console output in tests (comment out for debugging)
vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});
vi.spyOn(console, "warn").mockImplementation(() => {});

// Reset all mocks between tests
beforeEach(() => {
    vi.clearAllMocks();
});
