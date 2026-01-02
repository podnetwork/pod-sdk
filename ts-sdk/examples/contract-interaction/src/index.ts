/**
 * Contract Interaction Example
 *
 * This example demonstrates how to use @podnetwork/contracts
 * to interact with smart contracts on the pod Network.
 *
 * Prerequisites:
 * 1. Run `pnpm extract-abi` to generate ABI TypeScript files
 * 2. Deploy SimpleStorage contract to a pod network
 * 3. Update CONTRACT_ADDRESS below with the deployed address
 */

import { PodClient } from "@podnetwork/core";
import { Wallet } from "@podnetwork/wallet";
import { ContractsNamespace } from "@podnetwork/contracts";

// ABI generated from SimpleStorage.sol
// Run: extract-abi ./contracts/*.sol -o ./src/abis/
// Then import the generated ABI:
// import { simpleStorageAbi } from "./abis/simpleStorage.js";

// For demonstration, using inline ABI
const simpleStorageAbi = [
  {
    type: "constructor",
    inputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "get",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "set",
    inputs: [{ name: "newValue", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "increment",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MAX_VALUE",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "transferOwnership",
    inputs: [{ name: "newOwner", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "ValueChanged",
    inputs: [
      { name: "sender", type: "address", indexed: true, internalType: "address" },
      { name: "oldValue", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "newValue", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      { name: "previousOwner", type: "address", indexed: true, internalType: "address" },
      { name: "newOwner", type: "address", indexed: true, internalType: "address" },
    ],
    anonymous: false,
  },
  {
    type: "error",
    name: "NotOwner",
    inputs: [
      { name: "caller", type: "address", internalType: "address" },
      { name: "owner", type: "address", internalType: "address" },
    ],
  },
  {
    type: "error",
    name: "ValueTooLarge",
    inputs: [
      { name: "value", type: "uint256", internalType: "uint256" },
      { name: "maxValue", type: "uint256", internalType: "uint256" },
    ],
  },
] as const;

// Replace with your deployed contract address
const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

async function main() {
  console.log("=== pod Network Contract Interaction Example ===\n");

  // 1. Create a pod client
  const client = PodClient.dev();
  console.log("Connected to:", client.url);

  // 2. Create a wallet (for signing transactions)
  const wallet = Wallet.generate();
  console.log("Wallet address:", await wallet.getAddress());

  // 3. Create contracts namespace with transaction sender
  const contracts = new ContractsNamespace(client.getTransactionSender());

  // 4. Register the contract
  const storage = contracts.add("storage", CONTRACT_ADDRESS, simpleStorageAbi);
  console.log("\nRegistered contract at:", storage.address);

  // 5. List available methods
  console.log("\nAvailable functions:", storage.getFunctionNames());
  console.log("Available events:", storage.getEventNames());
  console.log("Available errors:", storage.getErrorNames());

  // 6. Example: Read operations (view functions)
  console.log("\n--- Read Operations ---");
  try {
    const getFn = storage.read["get"];
    if (getFn !== undefined) {
      const currentValue = await getFn();
      console.log("Current value:", currentValue);
    }

    const ownerFn = storage.read["owner"];
    if (ownerFn !== undefined) {
      const owner = await ownerFn();
      console.log("Contract owner:", owner);
    }

    const maxValueFn = storage.read["MAX_VALUE"];
    if (maxValueFn !== undefined) {
      const maxValue = await maxValueFn();
      console.log("Max value:", maxValue);
    }
  } catch (error) {
    console.log("Read failed (contract may not be deployed):", (error as Error).message);
  }

  // 7. Example: Create event filter for subscriptions
  console.log("\n--- Event Filters ---");
  const valueChangedFilter = storage.createEventFilter("ValueChanged");
  console.log("ValueChanged filter:", valueChangedFilter);

  // Filter for events from a specific sender
  const walletAddress = await wallet.getAddress();
  const filteredEventFilter = storage.createEventFilter("ValueChanged", [walletAddress]);
  console.log("Filtered ValueChanged filter:", filteredEventFilter);

  // 8. Example: Get error selectors
  console.log("\n--- Error Selectors ---");
  const errorSelectors = storage.getErrorSelectors();
  for (const [selector, name] of errorSelectors) {
    console.log(`${name}: ${selector}`);
  }

  // 9. Example: Parse revert data
  console.log("\n--- Error Parsing ---");
  // Simulated revert data for NotOwner error
  const notOwnerSelector = storage.getErrorSelector("NotOwner");
  console.log("NotOwner selector:", notOwnerSelector);

  // Check if data matches an error
  const sampleRevertData = notOwnerSelector + "0".repeat(128);
  if (storage.isError(sampleRevertData, "NotOwner")) {
    console.log("Revert data matches NotOwner error");
    const parsed = storage.parseError(sampleRevertData);
    if (parsed) {
      console.log("Parsed error:", parsed.errorName, parsed.errorArgs);
    }
  }

  // 10. Example: Write operation (requires deployed contract and funded wallet)
  console.log("\n--- Write Operations ---");
  console.log("To perform write operations:");
  console.log("1. Deploy the contract to a pod network");
  console.log("2. Update CONTRACT_ADDRESS in this file");
  console.log("3. Fund the wallet with some POD tokens");
  console.log("4. Uncomment the write code below");

  /*
  // Example write operation (uncomment after setup):
  try {
    const pending = await storage.write.set(wallet, 42n);
    console.log("Transaction hash:", pending.txHash);

    // Wait for receipt using the client's RPC
    const receipt = await client.rpc.getTransactionReceipt(pending.txHash);
    console.log("Transaction confirmed in block:", receipt?.blockNumber);
  } catch (error) {
    console.error("Write failed:", error);

    // Try to parse contract error
    if ((error as any).data) {
      const parsed = storage.parseError((error as any).data);
      if (parsed) {
        console.log("Contract error:", parsed.errorName, parsed.errorArgs);
      }
    }
  }
  */

  console.log("\n=== Example Complete ===");
}

main().catch(console.error);
