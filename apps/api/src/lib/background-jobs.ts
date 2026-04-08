const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

const isEnabled = (value: string | undefined, defaultValue: boolean) => {
    if (value === undefined) return defaultValue;
    return TRUE_VALUES.has(value.trim().toLowerCase());
};

export const backgroundJobsEnabled = () => isEnabled(
    process.env.ENABLE_BACKGROUND_JOBS,
    process.env.NODE_ENV !== "production"
);

export const schedulersEnabled = () => isEnabled(
    process.env.ENABLE_SCHEDULERS,
    backgroundJobsEnabled()
);

export const workersEnabled = () => isEnabled(
    process.env.ENABLE_WORKERS,
    backgroundJobsEnabled()
);

export const formatSchedulerError = (error: unknown) => {
    if (!(error instanceof Error)) {
        return { connectivity: false, message: "Unknown scheduler error" };
    }

    const message = error.message || "Unknown scheduler error";
    const connectivity = /Can't reach database server|PrismaClientInitializationError/i.test(message);

    return { connectivity, message };
};
