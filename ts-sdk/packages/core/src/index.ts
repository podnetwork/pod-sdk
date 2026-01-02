/**
 * @module @podnetwork/core
 * @description Core utilities, types, and client for Pod Network SDK
 */

export const VERSION = "0.1.0-dev.0" as const;

// Types
export * from "./types/index.js";

// Utilities
export * from "./utils/index.js";

// Errors
export * from "./errors/index.js";

// Logging
export * from "./logging/index.js";

// Constants
export * from "./constants.js";

// Schemas (RPC response validation)
export * from "./schemas/index.js";

// RPC namespace
export * from "./rpc/index.js";

// Transaction namespace
export * from "./tx/index.js";

// Client
export * from "./client/index.js";
