import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["packages/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    coverage: {
      provider: "v8",
      enabled: true,
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["packages/**/src/**/*.ts"],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/*.d.ts",
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/index.ts",
        "**/types.ts",
        "**/__tests__/**",
        "**/__mocks__/**",
      ],
      thresholds: {
        global: {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
      },
    },
    reporters: ["default", "verbose"],
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
  },
});
