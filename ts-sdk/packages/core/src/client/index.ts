/**
 * @module client
 * @description PodClient and configuration exports
 */

// Main client class
export { PodClient } from "./client.js";
export type { TransactionSender } from "./client.js";

// Configuration types and schemas
export type { PodClientConfig, PodClientConfigInput } from "./config.js";
export { PodClientConfigSchema, resolveConfig, validateConfig } from "./config.js";

// Gas price types and manager
export type { GasPriceStrategy, GasPriceFetcher } from "./gas-price.js";
export { GasPriceManager } from "./gas-price.js";
