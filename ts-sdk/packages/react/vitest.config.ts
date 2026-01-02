import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    testTimeout: 10000,
    hookTimeout: 10000,
    setupFiles: ["./tests/setup.ts"],
  },
});
