/**
 * WebSocket Subscriptions Example
 *
 * This example demonstrates how to:
 * 1. Connect to Chronos devnet WebSocket endpoint
 * 2. Subscribe to orderbook updates
 * 3. Subscribe to bid events
 * 4. Handle reconnection
 * 5. Cancel subscriptions
 *
 * Prerequisites:
 * - Access to Chronos devnet WebSocket endpoint
 * - Set ORDERBOOK_ID environment variable (or use default)
 *
 * Run with: pnpm start
 */

import { PodClient, formatPod } from "@podnetwork/core";
import {
  WsNamespace,
  createWsNamespace,
  isNewBidEvent,
  isCancelledBidEvent,
  isFilledBidEvent,
  type BidEvent,
  type OrderBookUpdate,
} from "@podnetwork/ws";

// Configuration
const ORDERBOOK_ID = process.env.ORDERBOOK_ID ?? "0x0000000000000000000000000000000000000001";
const SUBSCRIPTION_TIMEOUT_MS = 30_000; // Run for 30 seconds

async function main(): Promise<void> {
  console.log("=== Pod Network WebSocket Subscriptions Example ===\n");

  // 1. Get WebSocket URL from PodClient
  console.log("1. Getting Chronos devnet configuration...");
  const client = PodClient.chronosDev();
  const wsUrl = client.wsUrl;

  if (!wsUrl) {
    console.log("   ❌ No WebSocket URL configured for Chronos devnet");
    return;
  }

  console.log(`   HTTP URL: ${client.url}`);
  console.log(`   WebSocket URL: ${wsUrl}`);

  // 2. Create WebSocket namespace
  console.log("\n2. Creating WebSocket client...");
  const ws = createWsNamespace(wsUrl, { maxSubscriptions: 10 });
  console.log("   WebSocket client created");

  // Set up cancellation
  const controller = new AbortController();
  const signal = controller.signal;

  // Schedule cancellation after timeout
  console.log(`\n   Will run for ${String(SUBSCRIPTION_TIMEOUT_MS / 1000)} seconds...`);
  setTimeout(() => {
    console.log("\n⏰ Timeout reached, cancelling subscriptions...");
    controller.abort();
  }, SUBSCRIPTION_TIMEOUT_MS);

  // 3. Subscribe to orderbook updates
  console.log("\n3. Subscribing to orderbook updates...");
  console.log(`   OrderBook ID: ${ORDERBOOK_ID}`);

  // Run orderbook subscription
  const orderbookTask = subscribeToOrderbookUpdates(ws, ORDERBOOK_ID as `0x${string}`, signal);

  // 4. Subscribe to bid events
  console.log("\n4. Subscribing to bid events...");

  const bidTask = subscribeToBidEvents(ws, ORDERBOOK_ID as `0x${string}`, signal);

  // Wait for both subscriptions to complete (or be cancelled)
  try {
    await Promise.all([orderbookTask, bidTask]);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.log("   Subscriptions cancelled gracefully");
    } else {
      throw error;
    }
  }

  console.log("\n=== Example complete ===");
}

/**
 * Subscribe to orderbook updates and display them
 */
async function subscribeToOrderbookUpdates(
  ws: WsNamespace,
  orderbookId: `0x${string}`,
  signal: AbortSignal
): Promise<void> {
  console.log("   Starting orderbook subscription...");

  let updateCount = 0;

  try {
    for await (const update of ws.subscribeOrderbook(
      [orderbookId],
      10, // depth
      { signal }
    )) {
      updateCount++;
      displayOrderbookUpdate(update, updateCount);
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.log(`\n📊 Orderbook subscription ended after ${String(updateCount)} updates`);
      return;
    }
    throw error;
  }
}

/**
 * Subscribe to bid events and display them
 */
async function subscribeToBidEvents(
  ws: WsNamespace,
  orderbookId: `0x${string}`,
  signal: AbortSignal
): Promise<void> {
  console.log("   Starting bid events subscription...");

  let eventCount = 0;

  try {
    for await (const event of ws.subscribeBids([orderbookId], { signal })) {
      eventCount++;
      displayBidEvent(event, eventCount);
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.log(`\n📝 Bid events subscription ended after ${String(eventCount)} events`);
      return;
    }
    throw error;
  }
}

/**
 * Display an orderbook update
 */
function displayOrderbookUpdate(update: OrderBookUpdate, count: number): void {
  console.log(`\n📊 Orderbook Update #${String(count)}`);
  console.log(`   Timestamp: ${new Date(Number(update.timestamp)).toISOString()}`);

  const bestBid = update.bids.length > 0 ? update.bids[0] : undefined;
  const bestAsk = update.asks.length > 0 ? update.asks[0] : undefined;

  if (bestBid) {
    console.log(`   Best Bid: ${formatPod(bestBid.price)} @ ${formatPod(bestBid.volume)}`);
  } else {
    console.log("   Best Bid: (none)");
  }

  if (bestAsk) {
    console.log(`   Best Ask: ${formatPod(bestAsk.price)} @ ${formatPod(bestAsk.volume)}`);
  } else {
    console.log("   Best Ask: (none)");
  }

  console.log(`   Depth: ${String(update.bids.length)} bids, ${String(update.asks.length)} asks`);
}

/**
 * Display a bid event using discriminated union pattern
 */
function displayBidEvent(event: BidEvent, count: number): void {
  console.log(`\n📝 Bid Event #${String(count)}`);

  if (isNewBidEvent(event)) {
    console.log("   Type: NEW BID");
    console.log(`   Price: ${formatPod(event.info.price)} POD`);
    console.log(`   Volume: ${formatPod(event.info.volume)}`);
    console.log(`   Side: ${event.info.side}`);
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- type guard narrows correctly
    console.log(`   Owner: ${event.info.owner}`);
  } else if (isCancelledBidEvent(event)) {
    console.log("   Type: CANCELLED");
    console.log(`   TX Hash: ${event.txHash}`);
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- type guard narrows correctly
    console.log(`   Reason: ${event.reason}`);
  } else if (isFilledBidEvent(event)) {
    console.log("   Type: FILLED");
    console.log(`   TX Hash: ${event.txHash}`);
    console.log(`   Filled Amount: ${formatPod(event.filledAmount)}`);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- type guard narrows correctly
    console.log(`   Remaining: ${formatPod(event.remainingVolume)}`);
  }
}

main().catch(console.error);
