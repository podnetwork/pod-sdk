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
const { parseEther } = ethers;

/**
 * Sends a transaction and retrieves the list of validator attestations
 */
async function sendTransaction() {
  const tx = {
    to: TO_ADDRESS,
    value: parseEther("0.002"),
    gasLimit: 21000,
    maxPriorityFeePerGas: parseEther("0.0000001"),
    maxFeePerGas: parseEther("0.0000003"),
  };

  const balance = await provider.getBalance(wallet.address);
  console.log("📦 Current balance:", ethers.formatEther(balance), "OG");

  const sentTx = await wallet.sendTransaction(tx);
  console.log("🚀 Transaction sent! Hash:", sentTx.hash);

  const receipt = await sentTx.wait();
  console.log("🧾 Confirmed in block:", receipt.blockNumber);
  console.log("⛽ Gas used:", receipt.gasUsed.toString());

  await getPodAttestations(sentTx.hash);
}

/**
 * Queries Pod RPC to retrieve attestations from pod_metadata
 * @param {string} txHash - Transaction hash
 */
async function getPodAttestations(txHash) {
  try {
    const res = await axios.post(RPC_URL, {
      jsonrpc: "2.0",
      method: "eth_getTransactionReceipt",
      params: [txHash],
      id: 1,
    });

    const attestations = res.data?.result?.pod_metadata?.attestations;

    if (attestations) {
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

sendTransaction().catch(console.error);
