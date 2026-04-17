import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        setupFiles: ["./src/__tests__/setup.ts"],
        include: ["src/**/*.test.ts"],
        testTimeout: 10000,
        coverage: {
            provider: "v8",
            include: ["src/**/*.ts"],
            exclude: [
                "src/__tests__/**",
                "src/**/*.test.ts",
                "src/index.ts",
            ],
        },
    },
});
