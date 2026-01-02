# @podnetwork/core

[![npm version](https://img.shields.io/npm/v/@podnetwork/core.svg)](https://www.npmjs.com/package/@podnetwork/core)
[![npm downloads](https://img.shields.io/npm/dm/@podnetwork/core.svg)](https://www.npmjs.com/package/@podnetwork/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)

Core client, types, and utilities for interacting with pod network.

Part of the [pod network SDK](https://github.com/pod-network/pod-sdk) ·
[Documentation](https://docs.v1.pod.network/) ·
[Discord](http://discord.gg/kB935J4hMd)

## Installation

```bash
pnpm add @podnetwork/core
```

## Requirements

- **Node.js**: >= 24
- **TypeScript**: >= 5.7 (for best type inference)

## Quick Start

```typescript
import { PodClient, formatPod } from "@podnetwork/core";

// Connect to Chronos devnet (recommended for development)
const client = PodClient.chronosDev();

// Query balance
const balance = await client.rpc.getBalance(
  "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
);
console.log(`Balance: ${formatPod(balance)} POD`);

// Send a transaction
import { LocalWallet } from "@podnetwork/wallet";

const wallet = new LocalWallet("0x...");
const pending = await client.tx.sendTransaction(
  {
    to: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    value: parsePod("1.0"),
  },
  wallet
);

// Wait for confirmation (sub-200ms on pod network)
const receipt = await pending.waitForReceipt();
console.log(`Transaction ${receipt.status ? "succeeded" : "reverted"}`);
```

## Features

- **PodClient** — Main entry point with namespace-based API design
- **RPC operations** — Standard Ethereum JSON-RPC methods (`getBalance`,
  `getBlock`, etc.)
- **Transaction management** — Send, track, and confirm transactions with
  sub-200ms finality
- **Type-safe schemas** — Zod-based validation for all RPC responses
- **pod-specific features** — Validator attestations, committee queries, Past
  Perfect Time (PPT)
- **Error handling** — Unified error system with actionable suggestions
- **Utilities** — Address/hash validation, formatting (POD/Gwei), time
  conversion

## Usage

### Connecting to Networks

```typescript
import { PodClient } from "@podnetwork/core";

// Chronos devnet (most up-to-date, recommended)
const client = PodClient.chronosDev();

// Standard devnet
const client = PodClient.dev();

// Local node
const client = PodClient.local();

// Custom configuration
const client = new PodClient({
  url: "https://rpc.v1.dev.pod.network",
  timeout: 30000,
  gasPriceStrategy: "auto",
});
```

### RPC Queries

The `client.rpc` namespace provides blockchain query operations:

```typescript
// Get account balance
const balance = await client.rpc.getBalance(address);

// Get latest block number
const blockNumber = await client.rpc.getBlockNumber();

// Get block with transactions
const block = await client.rpc.getBlockByNumber("latest", true);

// Get transaction receipt with pod attestations
const receipt = await client.rpc.getTransactionReceipt(txHash);
if (receipt) {
  console.log(`Attested by ${receipt.podMetadata.signatureCount} validators`);
  console.log(
    `Committee epoch: ${receipt.podMetadata.attestedTx.committeeEpoch}`
  );
}

// Get transaction count (nonce)
const nonce = await client.rpc.getTransactionCount(address);

// Read-only contract call
const result = await client.rpc.call({
  to: contractAddress,
  data: encodedFunctionCall,
});

// Estimate gas
const gas = await client.rpc.estimateGas({
  to: recipient,
  value: parsePod("1.0"),
});

// Get gas price
const gasPrice = await client.rpc.getGasPrice();

// Get chain ID
const chainId = await client.rpc.getChainId();
```

### pod-Specific RPC Methods

```typescript
// Get validator committee
const committee = await client.rpc.getCommittee();
console.log(`Quorum size: ${committee.quorumSize}`);
console.log(`Total validators: ${committee.validators.length}`);

// Get vote batches from validators
const batches = await client.rpc.getVoteBatches(0n, 100n);

// Wait for Past Perfect Time (PPT) — network-wide monotonic timestamp
import { nowMicros, millisToMicros } from "@podnetwork/core";

const deadline = nowMicros() + millisToMicros(100);
await client.rpc.waitPastPerfectTime(deadline);
```

### Sending Transactions

The `client.tx` namespace handles transaction operations:

```typescript
import { LocalWallet } from "@podnetwork/wallet";
import { parsePod } from "@podnetwork/core";

const wallet = new LocalWallet("0x...");

// Simple transfer
const pending = await client.tx.sendTransaction(
  {
    to: recipientAddress,
    value: parsePod("1.0"),
  },
  wallet
);

// Contract interaction
const pending = await client.tx.sendTransaction(
  {
    to: contractAddress,
    data: encodedFunctionCall,
    gas: 200_000n,
  },
  wallet
);

// Wait for confirmation
const receipt = await pending.waitForReceipt();
console.log(`Gas used: ${receipt.gasUsed}`);

// Or poll for receipt manually
const receipt = await pending.waitForReceipt({
  timeout: 5000,
  interval: 100,
});
```

### Types and Schemas

```typescript
import type {
  Address,
  Hash,
  Bytes,
  Block,
  TransactionReceipt,
  Committee,
} from "@podnetwork/core";

// Runtime validation with Zod schemas
import {
  AddressSchema,
  HashSchema,
  BlockSchema,
  TransactionReceiptSchema,
} from "@podnetwork/core";

const validatedAddress = AddressSchema.parse("0x...");
```

### Utilities

```typescript
import {
  // Formatting
  parsePod,
  formatPod,
  formatPodFixed,
  parseGwei,
  formatGwei,
  // Address utilities
  toAddress,
  isAddress,
  isZeroAddress,
  ZERO_ADDRESS,
  // Hash utilities
  toHash,
  isHash,
  shortenHash,
  ZERO_HASH,
  // Time utilities (for PPT and auctions)
  nowMicros,
  secondsToMicros,
  millisToMicros,
  microsToMillis,
  microsToSeconds,
  // Environment detection
  isBrowser,
} from "@podnetwork/core";

// Format values
const amount = parsePod("1.5"); // 1500000000000000000n
const readable = formatPod(amount); // "1.5"
const fixed = formatPodFixed(amount, 4); // "1.5000"

// Address operations
if (isAddress("0x...")) {
  const addr = toAddress("0x...");
}

// Hash operations
const short = shortenHash("0xabc...def"); // "0xabc...def"
```

### Error Handling

```typescript
import { PodError, POD_ERRORS } from "@podnetwork/core";

try {
  await client.tx.sendTransaction(tx, wallet);
} catch (err) {
  // Normalize any error to PodError
  const podError = PodError.from(err);

  console.log(podError.code); // "POD_2001"
  console.log(podError.message); // "Insufficient funds"
  console.log(podError.suggestion); // "Request tokens from the faucet..."
  console.log(podError.isRetryable); // false

  // Code-based handling
  if (podError.code === POD_ERRORS.INSUFFICIENT_FUNDS) {
    // Show faucet link
  } else if (podError.code === POD_ERRORS.NETWORK_TIMEOUT) {
    // Retry with backoff
  }
}
```

## API Reference

For complete API documentation, see the
[TypeScript SDK API Reference](http://aaronbassett.github.io/pod-docs/typescript-sdk/).

## Coming from Ethereum?

pod network is EVM-compatible with some important differences:

### What's Different

| Feature              | Ethereum                  | pod network                         |
| -------------------- | ------------------------- | ----------------------------------- |
| **Finality**         | 12+ seconds               | Sub-200ms                           |
| **Transaction flow** | Mempool → Block inclusion | Batch auction → Direct settlement   |
| **MEV protection**   | Minimal                   | Built-in via batch auctions         |
| **Gas economics**    | EIP-1559 dynamic          | Fixed gas price (baseFeePerGas = 0) |
| **Confirmations**    | Wait for multiple blocks  | Single confirmation is final        |

### What's Similar

- Standard Ethereum JSON-RPC methods (`eth_*`)
- EIP-1559 transaction format (maxFeePerGas, maxPriorityFeePerGas)
- Same address format (checksummed 0x...)
- Same key derivation (secp256k1)
- Compatible with Ethereum tooling (MetaMask, Ledger, etc.)

### API Mapping

| Concept  | ethers.js                          | viem                                   | pod SDK                              |
| -------- | ---------------------------------- | -------------------------------------- | ------------------------------------ |
| Provider | `JsonRpcProvider`                  | `publicClient`                         | `PodClient`                          |
| Balance  | `provider.getBalance()`            | `publicClient.getBalance()`            | `client.rpc.getBalance()`            |
| Block    | `provider.getBlock()`              | `publicClient.getBlock()`              | `client.rpc.getBlockByNumber()`      |
| Receipt  | `provider.getTransactionReceipt()` | `publicClient.getTransactionReceipt()` | `client.rpc.getTransactionReceipt()` |
| Send TX  | `wallet.sendTransaction()`         | `walletClient.sendTransaction()`       | `client.tx.sendTransaction()`        |

### pod-Specific Features

These features are unique to pod network:

```typescript
// Validator attestations on every receipt
const receipt = await client.rpc.getTransactionReceipt(txHash);
console.log(receipt.podMetadata.signatureCount); // Number of validator signatures

// Query validator committee
const committee = await client.rpc.getCommittee();

// Past Perfect Time (network-wide monotonic timestamp)
await client.rpc.waitPastPerfectTime(deadline);

// Vote batch history
const batches = await client.rpc.getVoteBatches(0n, 100n);
```

## Related Packages

| Package                                           | Description                                   |
| ------------------------------------------------- | --------------------------------------------- |
| [`@podnetwork/wallet`](../wallet)                 | Local wallet for signing transactions         |
| [`@podnetwork/wallet-browser`](../wallet-browser) | Browser wallet integration (MetaMask, etc.)   |
| [`@podnetwork/orderbook`](../orderbook)           | CLOB trading operations                       |
| [`@podnetwork/auction`](../auction)               | Batch auction participation                   |
| [`@podnetwork/ws`](../ws)                         | WebSocket subscriptions for real-time updates |
| [`@podnetwork/faucet`](../faucet)                 | Testnet faucet integration                    |
| [`@podnetwork/contracts`](../contracts)           | Smart contract interactions                   |
| [`@podnetwork/react`](../react)                   | React hooks and components                    |

## Contributing

We welcome contributions! Please see our
[Contributing Guide](../../CONTRIBUTING.md) for details.

## License

[MIT](./LICENSE) © pod network
