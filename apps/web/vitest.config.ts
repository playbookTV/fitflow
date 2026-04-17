import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    test: {
        environment: "jsdom",
        setupFiles: ["./src/__tests__/setup.ts"],
        include: ["src/**/*.test.{ts,tsx}"],
        testTimeout: 10000,
        coverage: {
            provider: "v8",
            include: ["src/**/*.{ts,tsx}"],
            exclude: [
                "src/__tests__/**",
                "src/**/*.test.{ts,tsx}",
            ],
        },
    },
});
