/**
 * Basic Transfer Example
 *
 * This example demonstrates how to:
 * 1. Connect to Chronos devnet
 * 2. Create a wallet (or import from private key)
 * 3. Check wallet balance
 * 4. Send POD tokens
 * 5. Wait for transaction confirmation
 *
 * Prerequisites:
 * - Set PRIVATE_KEY environment variable with a funded wallet
 * - Or use the faucet to get tokens first
 *
 * Run with: pnpm start
 */

import { PodClient, formatPod, parsePod, TransactionError, NetworkError } from "@podnetwork/core";
import { Wallet, Mnemonic } from "@podnetwork/wallet";

// Configuration
const RECIPIENT_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc9e7595f8e6a2";
const TRANSFER_AMOUNT = "0.001"; // POD

async function main(): Promise<void> {
  console.log("=== Pod Network Basic Transfer Example ===\n");

  // 1. Connect to Chronos devnet
  console.log("1. Connecting to Chronos devnet...");
  const client = PodClient.chronosDev();
  console.log(`   Connected to: ${client.url}`);

  // 2. Set up wallet
  console.log("\n2. Setting up wallet...");
  let wallet: Wallet;

  if (process.env.PRIVATE_KEY) {
    // Import from environment variable
    wallet = Wallet.fromPrivateKey(process.env.PRIVATE_KEY as `0x${string}`);
    console.log(`   Imported wallet: ${wallet.address}`);
  } else {
    // Generate a new wallet for demonstration
    console.log("   No PRIVATE_KEY found, generating new wallet...");
    const mnemonic = Mnemonic.generate();
    wallet = Wallet.fromMnemonic(mnemonic, 0);
    console.log(`   Generated wallet: ${wallet.address}`);
    // eslint-disable-next-line @typescript-eslint/unbound-method, @typescript-eslint/restrict-template-expressions -- phrase is a getter, not a method
    console.log(`   Mnemonic (SAVE THIS): ${mnemonic.phrase}`);
    console.log("\n   ⚠️  This wallet has no funds. Request tokens from the faucet first.");
  }

  // 3. Check balance
  console.log("\n3. Checking balance...");
  const balance = await client.rpc.getBalance(wallet.address);
  console.log(`   Balance: ${formatPod(balance)} POD`);

  if (balance === 0n) {
    console.log("\n   ❌ Wallet has no balance. Please fund it first using the faucet.");
    console.log("   Run the faucet example to get testnet tokens.");
    return;
  }

  // 4. Prepare and send transaction
  console.log("\n4. Preparing transfer...");
  console.log(`   To: ${RECIPIENT_ADDRESS}`);
  console.log(`   Amount: ${TRANSFER_AMOUNT} POD`);

  const transferValue = parsePod(TRANSFER_AMOUNT);

  // Check if we have enough balance (including gas estimate)
  const estimatedGas = 21000n; // Standard transfer gas
  const gasPrice = await client.getGasPrice();
  const estimatedCost = transferValue + estimatedGas * gasPrice;

  if (balance < estimatedCost) {
    console.log(
      `\n   ❌ Insufficient funds. Need ~${formatPod(estimatedCost)} POD (including gas)`
    );
    return;
  }

  try {
    console.log("\n5. Sending transaction...");

    const pending = await client.tx.sendTransaction(
      {
        to: RECIPIENT_ADDRESS as `0x${string}`,
        value: transferValue,
      },
      wallet
    );

    console.log(`   Transaction hash: ${pending.txHash}`);
    console.log("   Waiting for confirmation...");

    // Wait for receipt with timeout
    const receipt = await pending.waitForReceipt({ timeoutMs: 60_000 });

    if (receipt.status) {
      console.log("\n   ✅ Transaction confirmed!");
      console.log(`   Block: ${String(receipt.blockNumber)}`);
      console.log(`   Gas used: ${String(receipt.gasUsed)}`);

      // Check pod-specific metadata
      console.log(`   Validator signatures: ${String(receipt.podMetadata.signatureCount)}`);
      console.log(`   Committee epoch: ${String(receipt.podMetadata.attestedTx.committeeEpoch)}`);
    } else {
      console.log("\n   ❌ Transaction reverted");
    }

    // 6. Check updated balance
    console.log("\n6. Checking updated balance...");
    const newBalance = await client.rpc.getBalance(wallet.address);
    console.log(`   New balance: ${formatPod(newBalance)} POD`);
    console.log(`   Spent: ${formatPod(balance - newBalance)} POD (including gas)`);
  } catch (error) {
    if (error instanceof TransactionError) {
      console.error(`\n   ❌ Transaction error: ${String(error.message)}`);
      console.error(`   Code: ${String(error.code)}`);
      if (error.txHash) {
        console.error(`   TX Hash: ${String(error.txHash)}`);
      }
    } else if (error instanceof NetworkError) {
      console.error(`\n   ❌ Network error: ${String(error.message)}`);
      if (error.retryable) {
        console.error("   This error is retryable - please try again.");
      }
    } else {
      throw error;
    }
  }

  console.log("\n=== Example complete ===");
}

main().catch(console.error);
