/**
 * @module e2e/helpers/wait
 * @description Waiting and polling utilities for e2e tests
 */

import type { PodClient } from "@podnetwork/core";
import type { Hash } from "@podnetwork/core";
import { POLL_INTERVAL, TX_CONFIRMATION_TIMEOUT } from "../fixtures/constants.js";

/**
 * Sleeps for the specified number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Waits for a specific block number to be reached.
 */
export async function waitForBlock(
  client: PodClient,
  targetBlock: bigint,
  timeout = TX_CONFIRMATION_TIMEOUT
): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access -- RPC type inference
    const block = await client.rpc.getBlockByNumber("latest");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- RPC type inference
    if (block && block.number >= targetBlock) {
      return;
    }
    await sleep(POLL_INTERVAL);
  }

  throw new Error(`Timeout waiting for block ${String(targetBlock)}`);
}

/**
 * Waits for a transaction to be included in a block.
 */
export async function waitForTransaction(
  client: PodClient,
  txHash: Hash,
  timeout = TX_CONFIRMATION_TIMEOUT
): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access -- RPC type inference
    const receipt = await client.rpc.getTransactionReceipt(txHash);
    if (receipt) {
      return;
    }
    await sleep(POLL_INTERVAL);
  }

  throw new Error(`Timeout waiting for transaction ${String(txHash)}`);
}

/**
 * Polls until a condition is met or timeout is reached.
 */
export async function waitUntil<T>(
  fn: () => Promise<T | undefined | null>,
  timeout = TX_CONFIRMATION_TIMEOUT,
  interval = POLL_INTERVAL
): Promise<T> {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const result = await fn();
    if (result !== undefined && result !== null) {
      return result;
    }
    await sleep(interval);
  }

  throw new Error("Timeout waiting for condition");
}
