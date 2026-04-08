const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

const isEnabled = (value: string | undefined, defaultValue: boolean) => {
    if (value === undefined) return defaultValue;
    return TRUE_VALUES.has(value.trim().toLowerCase());
};

// Default is ON in all environments. Set ENABLE_BACKGROUND_JOBS=false to disable explicitly.
// Previously this defaulted to OFF in production (NODE_ENV !== "production"), which caused
// silent failures — no workout deliveries, no check-in reminders, no renewal alerts.
export const backgroundJobsEnabled = () => isEnabled(
    process.env.ENABLE_BACKGROUND_JOBS,
    true
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
