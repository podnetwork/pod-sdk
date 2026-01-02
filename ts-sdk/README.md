# pod network TypeScript SDK

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-24+-green.svg)](https://nodejs.org/)

The official TypeScript SDK for building applications on pod network.

pod network is a high-performance blockchain with sub-200ms transaction
finality, MEV resistance through batch auction settlement, and no traditional
mempool. The SDK provides type-safe, runtime-validated client libraries for
Node.js and browser environments.

[Documentation](https://docs.v1.pod.network/) · [Examples](./examples) ·
[API Reference](http://aaronbassett.github.io/pod-docs/typescript-sdk/) ·
[Discord](http://discord.gg/kB935J4hMd)

## Features

- **Type-Safe** — Full TypeScript support with comprehensive type definitions
- **Runtime Validation** — All RPC responses validated with Zod schemas
- **Tree-Shakable** — Import only what you need for optimal bundle size
- **Namespace-Based API** — Clean, organized access: `client.rpc.*`,
  `client.tx.*`
- **Universal** — Works in Node.js and modern browsers
- **Error Handling** — Structured error codes with actionable suggestions
- **React Integration** — Hooks and headless components for React apps
- **WebSocket Support** — Real-time event subscriptions
- **Contract Interactions** — Type-safe smart contract calls with ABI management

## Installation

### Umbrella Package (Recommended)

Install everything in one package:

```bash
pnpm add @podnetwork/pod-sdk ethers
```

The umbrella package re-exports all SDK modules with convenient subpath imports:

```typescript
import { PodClient } from "@podnetwork/pod-sdk"; // Core client
import { Wallet } from "@podnetwork/pod-sdk/wallet"; // Wallet
import { OrderbookClient } from "@podnetwork/pod-sdk/orderbook";
```

### Individual Packages

For fine-grained control and smaller bundles, install only what you need:

```bash
# Core functionality (required)
pnpm add @podnetwork/core ethers

# Add optional packages as needed
pnpm add @podnetwork/wallet
pnpm add @podnetwork/contracts
pnpm add @podnetwork/orderbook
pnpm add @podnetwork/auction
pnpm add @podnetwork/ws
pnpm add @podnetwork/faucet
pnpm add @podnetwork/react
```

## Requirements

- **Node.js** 24+ or modern browser (ES2022+)
- **TypeScript** 5.0+ (recommended)
- **ethers** v6.0+ (peer dependency)

## Quick Start

```typescript
import { PodClient, formatPod } from "@podnetwork/core";
import { Wallet, Mnemonic } from "@podnetwork/wallet";

// 1. Connect to Chronos devnet
const client = PodClient.chronosDev();

// 2. Create or import a wallet
const mnemonic = Mnemonic.generate();
const wallet = Wallet.fromMnemonic(mnemonic, 0);

console.log("Address:", wallet.address);

// 3. Check balance
const balance = await client.rpc.getBalance(wallet.address);
console.log("Balance:", formatPod(balance), "WETH");

// 4. Send a transaction
const pending = await client.tx.sendTransaction(
  {
    to: "0x742d35Cc6634C0532925a3b844Bc9e7595f8e6a2",
    value: 1000000000000000n, // 0.001 WETH in wei
  },
  wallet
);

console.log("Transaction hash:", pending.txHash);

// 5. Wait for confirmation
const receipt = await pending.waitForReceipt();
console.log("Confirmed in block:", receipt.blockNumber);
console.log("Validator signatures:", receipt.podMetadata.signatureCount);
```

## Packages

| Package                                                   | Description                                                | Version                                                                                                                         |
| --------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| [`@podnetwork/pod-sdk`](./packages/pod-sdk)               | Umbrella package re-exporting all SDK modules              | [![npm](https://img.shields.io/npm/v/@podnetwork/pod-sdk.svg)](https://www.npmjs.com/package/@podnetwork/pod-sdk)               |
| [`@podnetwork/core`](./packages/core)                     | Core client, RPC methods, transaction handling, and types  | [![npm](https://img.shields.io/npm/v/@podnetwork/core.svg)](https://www.npmjs.com/package/@podnetwork/core)                     |
| [`@podnetwork/wallet`](./packages/wallet)                 | Wallet creation and management (Node.js and browser)       | [![npm](https://img.shields.io/npm/v/@podnetwork/wallet.svg)](https://www.npmjs.com/package/@podnetwork/wallet)                 |
| [`@podnetwork/wallet-browser`](./packages/wallet-browser) | Browser wallet integration (MetaMask, WalletConnect, etc.) | [![npm](https://img.shields.io/npm/v/@podnetwork/wallet-browser.svg)](https://www.npmjs.com/package/@podnetwork/wallet-browser) |
| [`@podnetwork/contracts`](./packages/contracts)           | Smart contract deployment and interaction utilities        | [![npm](https://img.shields.io/npm/v/@podnetwork/contracts.svg)](https://www.npmjs.com/package/@podnetwork/contracts)           |
| [`@podnetwork/abi`](./packages/abi)                       | ABI encoding, decoding, and contract interface management  | [![npm](https://img.shields.io/npm/v/@podnetwork/abi.svg)](https://www.npmjs.com/package/@podnetwork/abi)                       |
| [`@podnetwork/orderbook`](./packages/orderbook)           | CLOB trading client for limit orders and market data       | [![npm](https://img.shields.io/npm/v/@podnetwork/orderbook.svg)](https://www.npmjs.com/package/@podnetwork/orderbook)           |
| [`@podnetwork/auction`](./packages/auction)               | Batch auction participation and MEV-resistant trading      | [![npm](https://img.shields.io/npm/v/@podnetwork/auction.svg)](https://www.npmjs.com/package/@podnetwork/auction)               |
| [`@podnetwork/ws`](./packages/ws)                         | WebSocket subscriptions for real-time events               | [![npm](https://img.shields.io/npm/v/@podnetwork/ws.svg)](https://www.npmjs.com/package/@podnetwork/ws)                         |
| [`@podnetwork/faucet`](./packages/faucet)                 | Testnet faucet client for requesting devnet tokens         | [![npm](https://img.shields.io/npm/v/@podnetwork/faucet.svg)](https://www.npmjs.com/package/@podnetwork/faucet)                 |
| [`@podnetwork/react`](./packages/react)                   | React hooks and headless components                        | [![npm](https://img.shields.io/npm/v/@podnetwork/react.svg)](https://www.npmjs.com/package/@podnetwork/react)                   |

## Browser Security

When building browser applications that need to connect to user wallets
(MetaMask, WalletConnect, etc.), always use `BrowserWalletSigner` from
`@podnetwork/wallet-browser`:

```typescript
import { BrowserWalletSigner } from "@podnetwork/wallet-browser";
import { PodClient } from "@podnetwork/core";

const client = PodClient.chronosDev();
const signer = new BrowserWalletSigner();

// Request account access
await signer.connect();

// Sign and send transactions
const pending = await client.tx.sendTransaction(
  { to: "0x...", value: 1000n },
  signer
);
```

**Important**: Never use `Wallet.fromPrivateKey()` or `Wallet.fromMnemonic()` in
browser applications. These methods expose private keys in client-side code. Use
`BrowserWalletSigner` to delegate signing to the user's wallet extension.

## Error Handling

All SDK errors inherit from `PodError` and include structured error codes,
human-readable messages, and actionable suggestions:

```typescript
import { PodError, POD_ERRORS } from "@podnetwork/core";

try {
  await client.tx.sendTransaction(tx, wallet);
} catch (err) {
  const podError = PodError.from(err);

  console.log(podError.code); // "POD_2001"
  console.log(podError.message); // "Insufficient funds"
  console.log(podError.suggestion); // "Request tokens from the faucet..."
  console.log(podError.isRetryable); // false

  // Code-based handling
  if (podError.code === POD_ERRORS.INSUFFICIENT_FUNDS) {
    // Show faucet link
  }
}
```

Error codes follow the `POD_XXXX` format:

- **1xxx** — Network errors (connectivity, timeouts, RPC issues)
- **2xxx** — Funding errors (insufficient balance, gas estimation)
- **3xxx** — Execution errors (transaction reverts, contract errors)
- **4xxx** — Wallet errors (signing failures, invalid keys)
- **5xxx** — Auction errors (invalid bids, auction state)
- **6xxx** — Orderbook errors (invalid orders, market errors)

## Examples

The [`examples/`](./examples) directory contains complete working examples:

- **[basic-transfer](./examples/basic-transfer)** — Send WETH between accounts
- **[contract-interaction](./examples/contract-interaction)** — Deploy and call
  smart contracts
- **[orderbook-trading](./examples/orderbook-trading)** — Place limit orders on
  the CLOB
- **[auction-bidding](./examples/auction-bidding)** — Participate in batch
  auctions
- **[websocket-subscriptions](./examples/websocket-subscriptions)** — Subscribe
  to real-time events

Run any example:

```bash
cd examples/basic-transfer
pnpm install
pnpm start
```

## Documentation

- **[Getting Started](https://docs.v1.pod.network/)** — Comprehensive guides and
  tutorials
- **[API Reference](http://aaronbassett.github.io/pod-docs/typescript-sdk/)** —
  Full TypeDoc documentation
- **[Discord](http://discord.gg/kB935J4hMd)** — Ask questions and get help
- **[Twitter](https://x.com/poddotnetwork)** — Updates and announcements

## Coming from Ethereum?

pod network is EVM-compatible and uses familiar Ethereum concepts:

### What's Different

- **No mempool** — Transactions settle via batch auctions, not a traditional
  mempool
- **Sub-200ms finality** — No need to wait for multiple block confirmations
- **MEV resistant** — Batch auctions prevent frontrunning and sandwich attacks
- **WETH for gas** — Gas fees are paid in WETH (bridged Ethereum), not a native
  token

### What's Similar

- **Standard JSON-RPC** — Same methods you know: `eth_getBalance`,
  `eth_sendRawTransaction`, etc.
- **EIP-1559 transactions** — Compatible transaction format with `maxFeePerGas`
  and `maxPriorityFeePerGas`
- **Same addresses** — Standard Ethereum address format and key derivation
  (BIP-39/BIP-44)
- **Solidity contracts** — Deploy and interact with existing Ethereum contracts

### API Comparison

| Concept  | Ethereum (ethers/viem)             | pod SDK                                 |
| -------- | ---------------------------------- | --------------------------------------- |
| Provider | `JsonRpcProvider` / `publicClient` | `PodClient`                             |
| Balance  | `provider.getBalance(address)`     | `client.rpc.getBalance(address)`        |
| Send TX  | `wallet.sendTransaction(tx)`       | `client.tx.sendTransaction(tx, wallet)` |
| Block    | `provider.getBlock(blockNumber)`   | `client.rpc.getBlock(blockNumber)`      |
| Receipt  | `tx.wait()`                        | `pending.waitForReceipt()`              |

## Contributing

We welcome contributions! To get started:

```bash
# Clone the repository
git clone https://github.com/podnetwork/pod-sdk.git
cd pod-sdk/ts-sdk

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Run linter
pnpm lint

# Generate documentation
pnpm docs
```

Please see our [Contributing Guide](../CONTRIBUTING.md) for detailed guidelines.

## Community

- **[Discord](http://discord.gg/kB935J4hMd)** — Chat with the team and community
- **[Twitter](https://x.com/poddotnetwork)** — Follow for updates and
  announcements
- **[GitHub Issues](https://github.com/podnetwork/pod-sdk/issues)** — Report
  bugs and request features
- **[GitHub Discussions](https://github.com/podnetwork/pod-sdk/discussions)** —
  Ask questions and share ideas

## License

[MIT](./LICENSE) © pod network
