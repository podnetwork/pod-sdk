/**
 * @module e2e/setup/test-context
 * @description Shared test context for e2e tests
 */

import { PodClient } from "@podnetwork/core";
import { Wallet } from "@podnetwork/wallet";
import type { Address } from "@podnetwork/core";
import { TEST_PRIVATE_KEY, TEST_ADDRESS } from "../fixtures/constants.js";

/**
 * E2E test context containing client and wallet.
 */
export interface E2ETestContext {
  /** PodClient connected to local server */
  client: PodClient;
  /** Wallet with pre-funded test account */
  fundedWallet: Wallet;
  /** Chain ID of the connected network */
  chainId: bigint;
}

/**
 * Creates a test context with a PodClient connected to the local server
 * and a wallet with the pre-funded test account.
 */
export async function createTestContext(): Promise<E2ETestContext> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access -- SDK type inference
  const client = PodClient.local();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access -- SDK type inference
  const fundedWallet = Wallet.fromPrivateKey(TEST_PRIVATE_KEY);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access -- SDK type inference
  const chainId = await client.rpc.getChainId();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- SDK type inference
  return { client, fundedWallet, chainId };
}

/**
 * Creates a new random wallet for testing.
 * Useful for recipient addresses that don't need pre-funding.
 */
export function createRandomWallet(): Wallet {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access -- SDK type inference
  return Wallet.generate();
}

/**
 * Returns the pre-funded test wallet address.
 */
export function getTestAddress(): Address {
  return TEST_ADDRESS;
}

/**
 * Re-export constants for convenience.
 */
export { TEST_PRIVATE_KEY, TEST_ADDRESS };
