import { describe, it, expect, afterEach } from "vitest";
import {
    backgroundJobsEnabled,
    schedulersEnabled,
    workersEnabled,
    formatSchedulerError,
} from "../background-jobs";

describe("background-jobs", () => {
    // Save original env values
    const origBG = process.env.ENABLE_BACKGROUND_JOBS;
    const origSch = process.env.ENABLE_SCHEDULERS;
    const origWrk = process.env.ENABLE_WORKERS;

    afterEach(() => {
        // Restore original values
        if (origBG === undefined) delete process.env.ENABLE_BACKGROUND_JOBS;
        else process.env.ENABLE_BACKGROUND_JOBS = origBG;
        if (origSch === undefined) delete process.env.ENABLE_SCHEDULERS;
        else process.env.ENABLE_SCHEDULERS = origSch;
        if (origWrk === undefined) delete process.env.ENABLE_WORKERS;
        else process.env.ENABLE_WORKERS = origWrk;
    });

    describe("backgroundJobsEnabled", () => {
        it("defaults to true when ENABLE_BACKGROUND_JOBS is not set", () => {
            delete process.env.ENABLE_BACKGROUND_JOBS;
            expect(backgroundJobsEnabled()).toBe(true);
        });

        it("returns false when ENABLE_BACKGROUND_JOBS is 'false'", () => {
            process.env.ENABLE_BACKGROUND_JOBS = "false";
            expect(backgroundJobsEnabled()).toBe(false);
        });

        it("returns true when ENABLE_BACKGROUND_JOBS is '1'", () => {
            process.env.ENABLE_BACKGROUND_JOBS = "1";
            expect(backgroundJobsEnabled()).toBe(true);
        });

        it("returns true when ENABLE_BACKGROUND_JOBS is 'yes'", () => {
            process.env.ENABLE_BACKGROUND_JOBS = "yes";
            expect(backgroundJobsEnabled()).toBe(true);
        });
    });

    describe("schedulersEnabled", () => {
        it("follows backgroundJobsEnabled when ENABLE_SCHEDULERS is not set", () => {
            process.env.ENABLE_BACKGROUND_JOBS = "false";
            delete process.env.ENABLE_SCHEDULERS;
            expect(schedulersEnabled()).toBe(false);
        });

        it("can be overridden independently", () => {
            process.env.ENABLE_BACKGROUND_JOBS = "false";
            process.env.ENABLE_SCHEDULERS = "true";
            expect(schedulersEnabled()).toBe(true);
        });
    });

    describe("workersEnabled", () => {
        it("follows backgroundJobsEnabled when ENABLE_WORKERS is not set", () => {
            process.env.ENABLE_BACKGROUND_JOBS = "false";
            delete process.env.ENABLE_WORKERS;
            expect(workersEnabled()).toBe(false);
        });

        it("can be overridden independently", () => {
            process.env.ENABLE_BACKGROUND_JOBS = "false";
            process.env.ENABLE_WORKERS = "true";
            expect(workersEnabled()).toBe(true);
        });
    });

    describe("formatSchedulerError", () => {
        it("handles non-Error inputs", () => {
            const result = formatSchedulerError("some string");
            expect(result.connectivity).toBe(false);
            expect(result.message).toBe("Unknown scheduler error");
        });

        it("detects connectivity errors", () => {
            const result = formatSchedulerError(new Error("Can't reach database server at localhost:5432"));
            expect(result.connectivity).toBe(true);
        });

        it("detects Prisma initialization errors", () => {
            const result = formatSchedulerError(new Error("PrismaClientInitializationError: something"));
            expect(result.connectivity).toBe(true);
        });

        it("returns message for regular errors", () => {
            const result = formatSchedulerError(new Error("Something went wrong"));
            expect(result.connectivity).toBe(false);
            expect(result.message).toBe("Something went wrong");
        });
    });
});
