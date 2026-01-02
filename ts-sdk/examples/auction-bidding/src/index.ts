/**
 * Auction Bidding Example
 *
 * This example demonstrates how to:
 * 1. Connect to Chronos devnet
 * 2. Build and submit an auction bid
 * 3. Wait for the deadline to pass
 * 4. Query final auction bids
 *
 * Prerequisites:
 * - Set PRIVATE_KEY environment variable with a funded wallet
 * - Set AUCTION_ID environment variable (or use default)
 *
 * Run with: pnpm start
 */

import { PodClient, formatPod, parsePod, TransactionError } from "@podnetwork/core";
import { Wallet } from "@podnetwork/wallet";
import { AuctionNamespace, AuctionBid, type AuctionBidInfo } from "@podnetwork/auction";

// Configuration - set via environment variables
const AUCTION_ID = BigInt(process.env.AUCTION_ID ?? "1");
const BID_AMOUNT = "1.0"; // POD

async function main(): Promise<void> {
  console.log("=== Pod Network Auction Bidding Example ===\n");

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

  // 3. Create auction namespace
  console.log("\n3. Creating auction client...");
  const auction = new AuctionNamespace(
    {
      url: client.url,
      timeout: client.config.timeout,
      maxRetries: client.config.maxRetries,
    },
    client.getTransactionSender()
  );

  // 4. Check existing bids for this auction
  console.log("\n4. Checking existing auction bids...");
  console.log(`   Auction ID: ${String(AUCTION_ID)}`);

  const existingBids = await auction.getBids(AUCTION_ID);
  if (existingBids.length === 0) {
    console.log("   No bids yet - you could be the first!");
  } else {
    console.log(`   Found ${String(existingBids.length)} existing bid(s)`);
    displayBids(existingBids);
  }

  // 5. Build an auction bid
  console.log("\n5. Building auction bid...");
  console.log(`   Amount: ${BID_AMOUNT} POD`);

  const bidAmount = parsePod(BID_AMOUNT);
  const deadlineMinutes = 1; // 1 minute from now

  const bid = AuctionBid.builder().amount(bidAmount).deadlineMinutes(deadlineMinutes).build();

  console.log(`   Deadline: ${new Date(Number(bid.deadline / 1000n)).toISOString()}`);
  console.log("   Bid built successfully");

  // 6. Submit the bid
  console.log("\n6. Submitting bid...");

  try {
    const pending = await auction.submitBid(AUCTION_ID, bid, wallet);
    console.log(`   Transaction hash: ${pending.txHash}`);
    console.log("   ✅ Bid submitted!");

    // 7. Check updated bids
    console.log("\n7. Checking updated auction bids...");
    const updatedBids = await auction.getBids(AUCTION_ID);
    console.log(`   Total bids: ${String(updatedBids.length)}`);
    displayBids(updatedBids);

    // 8. Demonstrate waiting for deadline
    console.log("\n8. Waiting for auction deadline...");
    console.log("   (Skipping wait in this demo - would normally take 1 minute)");
    console.log("   To wait for deadline, you would use:");
    console.log(`   await auction.waitForDeadline(bid.deadline);`);
    console.log(`   const finalBids = await auction.getBids(${String(AUCTION_ID)}n);`);
  } catch (error) {
    if (error instanceof TransactionError) {
      console.error(`\n   ❌ Transaction error: ${String(error.message)}`);
      console.error(`   Code: ${String(error.code)}`);

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
 * Display auction bids in a formatted way
 */
function displayBids(bids: AuctionBidInfo[]): void {
  if (bids.length === 0) return;

  // Find highest bid
  const sortedBids = [...bids].sort((a, b) => (b.amount > a.amount ? 1 : -1));
  const highestBid = sortedBids[0];

  console.log("\n   📊 Auction Bids:");
  for (const bid of sortedBids) {
    const isHighest = bid === highestBid ? " 👑" : "";
    console.log(`   - ${bid.bidder}: ${formatPod(bid.amount)} POD${isHighest}`);
  }
}

main().catch(console.error);
