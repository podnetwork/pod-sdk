import { defineWorkspace } from "vitest/config";
import { resolve } from "path";

const packagesDir = resolve(__dirname, "packages");

export default defineWorkspace([
  {
    test: {
      name: "unit",
      globals: true,
      environment: "node",
      include: [
        "packages/**/tests/**/*.test.ts",
        "packages/**/src/__tests__/**/*.test.ts",
      ],
      // Exclude React package tests (they need jsdom) and e2e
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/e2e/**",
        "packages/react/**",
      ],
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
  },
  // React package tests need jsdom for DOM APIs
  {
    test: {
      name: "react",
      globals: true,
      environment: "jsdom",
      include: [
        "packages/react/tests/**/*.test.ts",
        "packages/react/tests/**/*.test.tsx",
      ],
      exclude: ["**/node_modules/**", "**/dist/**"],
      testTimeout: 10000,
      hookTimeout: 10000,
      teardownTimeout: 5000,
      setupFiles: ["./packages/react/tests/setup.ts"],
      coverage: {
        provider: "v8",
        enabled: true,
        reporter: ["text", "json", "html", "lcov"],
        reportsDirectory: "./coverage",
        include: ["packages/react/src/**/*.ts", "packages/react/src/**/*.tsx"],
        exclude: [
          "**/node_modules/**",
          "**/dist/**",
          "**/*.d.ts",
          "**/*.test.ts",
          "**/*.test.tsx",
          "**/*.spec.ts",
          "**/index.ts",
          "**/types.ts",
          "**/__tests__/**",
          "**/__mocks__/**",
        ],
      },
      reporters: ["default", "verbose"],
      pool: "threads",
      poolOptions: {
        threads: {
          singleThread: false,
        },
      },
    },
  },
  {
    resolve: {
      alias: {
        "@podnetwork/core": resolve(packagesDir, "core/src/index.ts"),
        "@podnetwork/wallet": resolve(packagesDir, "wallet/src/index.ts"),
        "@podnetwork/wallet-browser": resolve(packagesDir, "wallet-browser/src/index.ts"),
        "@podnetwork/ws": resolve(packagesDir, "ws/src/index.ts"),
        "@podnetwork/orderbook": resolve(packagesDir, "orderbook/src/index.ts"),
        "@podnetwork/auction": resolve(packagesDir, "auction/src/index.ts"),
        "@podnetwork/faucet": resolve(packagesDir, "faucet/src/index.ts"),
        "pod-sdk": resolve(packagesDir, "pod-sdk/src/index.ts"),
      },
    },
    test: {
      name: "e2e",
      globals: true,
      environment: "node",
      include: ["e2e/**/*.test.ts"],
      exclude: ["**/node_modules/**", "**/dist/**"],
      testTimeout: 60000,
      hookTimeout: 30000,
      teardownTimeout: 10000,
      retry: 0,
      sequence: {
        shuffle: false,
      },
      pool: "forks",
      poolOptions: {
        forks: {
          singleFork: true,
        },
      },
      globalSetup: ["./e2e/setup/global-setup.ts"],
    },
  },
]);
