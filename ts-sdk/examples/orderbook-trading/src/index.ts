/**
 * OrderBook Trading Example
 *
 * This example demonstrates how to:
 * 1. Connect to Chronos devnet
 * 2. Query orderbook state (bids, asks, spread)
 * 3. Build and place a bid
 * 4. Cancel a bid
 *
 * Prerequisites:
 * - Set PRIVATE_KEY environment variable with a funded wallet
 * - Set ORDERBOOK_ID environment variable with the target orderbook address
 *
 * Run with: pnpm start
 */

import { PodClient, formatPod, parsePod, TransactionError } from "@podnetwork/core";
import { Wallet } from "@podnetwork/wallet";
import { OrderbookNamespace, OrderBook, OrderBookBid } from "@podnetwork/orderbook";

// Configuration - set these via environment variables
const ORDERBOOK_ID = process.env.ORDERBOOK_ID ?? "0x0000000000000000000000000000000000000001";
const BID_PRICE = "99.5"; // Price per unit in POD
const BID_VOLUME = "1.0"; // Volume to bid

async function main(): Promise<void> {
  console.log("=== Pod Network OrderBook Trading Example ===\n");

  // Validate environment
  if (!process.env.PRIVATE_KEY) {
    console.log("❌ Please set PRIVATE_KEY environment variable");
    console.log("   Example: PRIVATE_KEY=0x... pnpm start");
    return;
  }

  // 1. Connect to Chronos devnet
  console.log("1. Connecting to Chronos devnet...");
  const client = PodClient.chronosDev();
  console.log(`   Connected to: ${client.url}`);

  // 2. Set up wallet
  console.log("\n2. Setting up wallet...");
  const wallet = Wallet.fromPrivateKey(process.env.PRIVATE_KEY as `0x${string}`);
  console.log(`   Wallet address: ${wallet.address}`);

  // Check balance
  const balance = await client.rpc.getBalance(wallet.address);
  console.log(`   Balance: ${formatPod(balance)} POD`);

  // 3. Create orderbook namespace
  console.log("\n3. Creating orderbook client...");
  const orderbook = new OrderbookNamespace(
    {
      url: client.url,
      timeout: client.config.timeout,
      maxRetries: client.config.maxRetries,
    },
    client.getTransactionSender()
  );

  // 4. Query orderbook state
  console.log("\n4. Querying orderbook state...");
  console.log(`   OrderBook ID: ${ORDERBOOK_ID}`);

  try {
    const orderbookState = await orderbook.getOrderbook(ORDERBOOK_ID as `0x${string}`);

    if (!orderbookState) {
      console.log("   ⚠️  OrderBook not found or empty");
      console.log("   This may be a demo - proceeding with bid placement anyway...");
    } else {
      displayOrderbookState(orderbookState);
    }
  } catch {
    console.log("   ⚠️  Could not fetch orderbook state (may not exist yet)");
    console.log("   Proceeding with bid placement...");
  }

  // 5. Build a bid
  console.log("\n5. Building a bid...");
  console.log(`   Side: buy`);
  console.log(`   Price: ${BID_PRICE} POD`);
  console.log(`   Volume: ${BID_VOLUME} units`);

  const bid = OrderBookBid.builder()
    .side("buy")
    .price(parsePod(BID_PRICE))
    .volume(parsePod(BID_VOLUME))
    .orderbookId(ORDERBOOK_ID as `0x${string}`)
    .ttl(3_600_000_000n) // 1 hour in microseconds
    .build();

  console.log(`   TTL: 1 hour`);
  console.log(`   Bid built successfully`);

  // 6. Place the bid
  console.log("\n6. Placing bid...");

  try {
    const pending = await orderbook.placeBid(bid, wallet);
    console.log(`   Transaction hash: ${pending.txHash}`);
    console.log("   Waiting for confirmation...");

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call -- SDK type inference limitation
    const receipt = await pending.waitForReceipt({ timeoutMs: 60_000 });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- SDK type inference limitation
    if (receipt.status === 1n) {
      console.log("\n   ✅ Bid placed successfully!");
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- SDK type inference limitation
      console.log(`   Block: ${String(receipt.blockNumber)}`);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- SDK type inference limitation
      console.log(`   Gas used: ${String(receipt.gasUsed)}`);

      // 7. Optionally cancel the bid (demonstration)
      console.log("\n7. Demonstrating bid cancellation...");
      console.log("   (Skipping cancellation in this demo to preserve the bid)");
      console.log("   To cancel, you would use:");
      console.log(`   const cancelPending = await orderbook.cancelBid(bidId, wallet);`);
    } else {
      console.log("\n   ❌ Bid transaction reverted");
    }
  } catch (error) {
    if (error instanceof TransactionError) {
      console.error(`\n   ❌ Transaction error: ${String(error.message)}`);
      console.error(`   Code: ${String(error.code)}`);

      // Common orderbook errors
      if (error.code === "INSUFFICIENT_FUNDS") {
        console.error("   Tip: Make sure you have enough POD to cover the bid + gas");
      }
    } else {
      throw error;
    }
  }

  console.log("\n=== Example complete ===");
}

/**
 * Display orderbook state in a formatted way
 */
function displayOrderbookState(orderbook: OrderBook): void {
  console.log("\n   📊 OrderBook State:");

  const bestBid = orderbook.bestBid();
  const bestAsk = orderbook.bestAsk();
  const spread = orderbook.spread();
  const midPrice = orderbook.midPrice();
  const depth = orderbook.depth();

  if (bestBid !== undefined) {
    console.log(`   Best Bid: ${formatPod(bestBid)} POD`);
  } else {
    console.log("   Best Bid: (none)");
  }

  if (bestAsk !== undefined) {
    console.log(`   Best Ask: ${formatPod(bestAsk)} POD`);
  } else {
    console.log("   Best Ask: (none)");
  }

  if (spread !== undefined) {
    console.log(`   Spread: ${formatPod(spread)} POD`);
  }

  if (midPrice !== undefined) {
    console.log(`   Mid Price: ${formatPod(midPrice)} POD`);
  }

  console.log(`   Depth: ${String(depth.bids)} bids, ${String(depth.asks)} asks`);

  // Show top of book
  if (orderbook.bids.length > 0) {
    console.log("\n   Top 3 Bids:");
    orderbook.bids.slice(0, 3).forEach((level, i) => {
      console.log(`     ${String(i + 1)}. ${formatPod(level.price)} @ ${formatPod(level.volume)}`);
    });
  }

  if (orderbook.asks.length > 0) {
    console.log("\n   Top 3 Asks:");
    orderbook.asks.slice(0, 3).forEach((level, i) => {
      console.log(`     ${String(i + 1)}. ${formatPod(level.price)} @ ${formatPod(level.volume)}`);
    });
  }
}

main().catch(console.error);
