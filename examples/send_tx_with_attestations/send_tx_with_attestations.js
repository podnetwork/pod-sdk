require("dotenv").config();
const { ethers } = require("ethers");
const axios = require("axios");

// Load environment variables
const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const TO_ADDRESS = process.env.TO_ADDRESS;

if (!RPC_URL || !PRIVATE_KEY || !TO_ADDRESS) {
  console.error("❌ Missing RPC_URL, PRIVATE_KEY or TO_ADDRESS in .env");
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const { parseEther, parseUnits, formatEther } = ethers;

/**
 * Sends a transaction and retrieves the list of validator attestations
 */
async function sendTransaction() {
  try {
    const tx = {
      to: TO_ADDRESS,
      value: parseEther("0.002"),              // 0.002 pETH
      gasLimit: 21000,
      maxPriorityFeePerGas: 0n,                // BigInt
      maxFeePerGas: parseUnits("300", "gwei"), // 300 gwei
    };

    const balance = await provider.getBalance(wallet.address);
    console.log("📦 Current balance:", formatEther(balance), "pETH");

    const net = await provider.getNetwork();
    console.log("🛰️ Network chainId:", net.chainId.toString());

    const t0 = Date.now();
    const sentTx = await wallet.sendTransaction(tx);
    console.log("🚀 Transaction sent! Hash:", sentTx.hash);
    console.log("🧩 Nonce:", sentTx.nonce);

    const receipt = await sentTx.wait();

    const latencyMs = Date.now() - t0;
    const status = receipt.status === 1 ? "success" : "reverted";
    const gasUsed = receipt.gasUsed; // bigint

    // Fallbacks: prefer receipt.effectiveGasPrice, else fall back to what we sent or legacy gasPrice
    const effGasPrice =
      receipt.effectiveGasPrice ??
      sentTx.maxFeePerGas ??
      sentTx.gasPrice ??
      0n;

    const feeWei = gasUsed * effGasPrice;

    console.log(`✅ Finalized: ${status} in ${latencyMs} ms`);
    console.log("⛽ Gas used:", gasUsed.toString());

    if (effGasPrice && effGasPrice !== 0n) {
      console.log(
        "💰 Fee paid:",
        `${formatEther(feeWei)} pETH (${effGasPrice.toString()} wei/gas)`
      );
    }

    if (typeof receipt.transactionIndex === "number") {
      console.log("📌 Transaction index:", receipt.transactionIndex);
    }

    await getPodAttestations(sentTx.hash);
  } catch (e) {
    console.error("❌ sendTransaction failed:", e?.message ?? e);
  }
}

/**
 * Queries Pod RPC to retrieve attestations from pod_metadata
 * @param {string} txHash - Transaction hash
 */
async function getPodAttestations(txHash) {
  try {
    const res = await axios.post(
      RPC_URL,
      {
        jsonrpc: "2.0",
        method: "eth_getTransactionReceipt",
        params: [txHash],
        id: 1,
      },
      { timeout: 10000 }
    );

    const attestations = res.data?.result?.pod_metadata?.attestations;

    if (Array.isArray(attestations) && attestations.length > 0) {
      console.log(`🧾 Confirmed with ${attestations.length} attestations:`);
      attestations.forEach((a, i) => {
        console.log(`  #${i + 1} signer: ${a.public_key}`);
      });
    } else {
      console.log("⚠️ No attestations found.");
    }
  } catch (err) {
    console.error("❌ Failed to fetch attestations:", err.message);
  }
}

sendTransaction().catch((e) => console.error("❌ Unhandled error:", e));
