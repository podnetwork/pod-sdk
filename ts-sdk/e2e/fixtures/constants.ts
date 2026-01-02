/**
 * @module e2e/fixtures/constants
 * @description Constants for e2e tests
 */

import type { Address, Hash } from "@podnetwork/core";

/**
 * Local server RPC URL (can be overridden via environment variable).
 */
export const LOCAL_RPC_URL = process.env.POD_RPC_URL ?? "http://127.0.0.1:10600";

/**
 * Local server WebSocket URL (can be overridden via environment variable).
 */
export const LOCAL_WS_URL = process.env.POD_WS_URL ?? "ws://127.0.0.1:9002";

/**
 * Local chain ID.
 */
export const LOCAL_CHAIN_ID = 1293n;

/**
 * Local faucet URL.
 */
export const LOCAL_FAUCET_URL = "http://127.0.0.1:9800";

// =============================================================================
// Chronos devnet (CLOB - for faucet tests)
// =============================================================================

/**
 * Chronos devnet RPC URL.
 */
export const CHRONOS_DEV_RPC_URL = "https://clob.pod.network:10602";

/**
 * Chronos devnet WebSocket URL.
 */
export const CHRONOS_DEV_WS_URL = "wss://clob.pod.network:9002";

/**
 * Chronos devnet faucet URL.
 */
export const CHRONOS_DEV_FAUCET_URL = "https://clobfaucet.pod.network";

/**
 * Chronos devnet chain ID.
 */
export const CHRONOS_DEV_CHAIN_ID = 1293n;

/**
 * Well-known test private key (Anvil/Hardhat default account 0).
 * This account should be pre-funded on the local node.
 */
export const TEST_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

/**
 * Address corresponding to TEST_PRIVATE_KEY.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- branded type assertion
export const TEST_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as Address;

/**
 * One POD in wei (10^18).
 */
export const ONE_POD = 10n ** 18n;

/**
 * Default transfer amount for tests (0.1 POD).
 */
export const TEST_TRANSFER_AMOUNT = ONE_POD / 10n;

/**
 * Timeout for transaction confirmation (30 seconds).
 */
export const TX_CONFIRMATION_TIMEOUT = 30_000;

/**
 * Timeout for WebSocket connection (10 seconds).
 */
export const WS_CONNECTION_TIMEOUT = 10_000;

/**
 * Polling interval for waiting utilities (500ms).
 */
export const POLL_INTERVAL = 500;

/**
 * Zero hash constant for testing.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- branded type assertion
export const ZERO_HASH = ("0x" + "0".repeat(64)) as Hash;

/**
 * Zero address constant for testing.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- branded type assertion
export const ZERO_ADDRESS = ("0x" + "0".repeat(40)) as Address;
