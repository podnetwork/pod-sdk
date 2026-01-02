# @podnetwork/pod-sdk

[![npm version](https://img.shields.io/npm/v/@podnetwork/pod-sdk.svg)](https://www.npmjs.com/package/@podnetwork/pod-sdk)
[![npm downloads](https://img.shields.io/npm/dm/@podnetwork/pod-sdk.svg)](https://www.npmjs.com/package/@podnetwork/pod-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)

The official pod network SDK for TypeScript — recommended single-install package
for most users.

Part of the [pod network SDK](https://github.com/pod-network/pod-sdk) ·
[Documentation](https://docs.v1.pod.network/) ·
[Discord](http://discord.gg/kB935J4hMd)

## Installation

```bash
pnpm add @podnetwork/pod-sdk ethers
```

**Peer Dependencies**: Requires `ethers ^6.0.0`

## Requirements

- Node.js >= 24
- TypeScript >= 5.7 (recommended)

## Quick Start

```typescript
import { PodClient, Wallet } from "@podnetwork/pod-sdk";

// Connect to pod network
const client = PodClient.chronosDev();

// Create a wallet
const wallet = Wallet.generate();

// Send a transaction
const pending = await client.tx.sendTransaction(
  {
    to: "0x742d35Cc6634C0532925a3b844Bc9e7595f8e6a2",
    value: 1000000000000000000n, // 1 WETH
  },
  wallet
);

console.log(`Transaction sent: ${pending.hash}`);
```

## Features

This umbrella package includes everything you need to build on pod network:

- **Core Client** — RPC methods, transaction management, and network
  configuration
- **Wallet Management** — Local wallets, HD wallets, encrypted keystores, and
  browser wallet integration
- **WebSocket Support** — Real-time subscriptions for blocks, transactions, and
  events
- **CLOB Trading** — Central limit orderbook for high-frequency trading
- **Batch Auctions** — MEV-resistant transaction settlement via batch auctions
- **Smart Contracts** — Type-safe contract interactions with full TypeScript
  inference
- **React Integration** — Hooks and headless components for React applications
- **Testnet Faucet** — Request test tokens for development

## Included Packages

This package re-exports all pod SDK functionality from the following packages:

| Package                   | Description                               | Individual Install                      |
| ------------------------- | ----------------------------------------- | --------------------------------------- |
| **@podnetwork/core**      | Core client, RPC methods, and types       | `pnpm add @podnetwork/core`             |
| **@podnetwork/wallet**    | Wallet management and transaction signing | `pnpm add @podnetwork/wallet ethers`    |
| **@podnetwork/ws**        | WebSocket subscriptions                   | `pnpm add @podnetwork/ws`               |
| **@podnetwork/orderbook** | CLOB orderbook client                     | `pnpm add @podnetwork/orderbook`        |
| **@podnetwork/auction**   | Batch auction participation               | `pnpm add @podnetwork/auction`          |
| **@podnetwork/contracts** | Type-safe smart contract interactions     | `pnpm add @podnetwork/contracts ethers` |
| **@podnetwork/faucet**    | Testnet faucet client                     | `pnpm add @podnetwork/faucet`           |
| **@podnetwork/react**     | React hooks and components                | `pnpm add @podnetwork/react react`      |

## Usage

### Import Everything

```typescript
import * as PodSdk from "@podnetwork/pod-sdk";

const client = PodSdk.PodClient.chronosDev();
const wallet = PodSdk.Wallet.generate();
```

### Import Specific Exports

```typescript
import { PodClient, Wallet, BrowserWalletSigner } from "@podnetwork/pod-sdk";

const client = PodClient.chronosDev();
const wallet = Wallet.generate();
```

### Submodule Imports for Tree-Shaking

For smaller bundle sizes in browser applications, you can import from specific
submodules:

```typescript
// Core functionality
import { PodClient } from "@podnetwork/pod-sdk/core";

// Wallet functionality
import { Wallet } from "@podnetwork/pod-sdk/wallet";

// WebSocket subscriptions
import { createWsNamespace } from "@podnetwork/pod-sdk/ws";

// Orderbook
import { OrderbookNamespace } from "@podnetwork/pod-sdk/orderbook";

// Auctions
import { AuctionNamespace } from "@podnetwork/pod-sdk/auction";

// Smart contracts
import { TypedContract } from "@podnetwork/pod-sdk/contracts";

// Testnet faucet
import { FaucetNamespace } from "@podnetwork/pod-sdk/faucet";
```

### Individual Package Installation

For even more granular control, you can install individual packages:

```bash
# Install only what you need
pnpm add @podnetwork/core @podnetwork/wallet ethers
```

This is useful for:

- **Backend services** that only need RPC access
- **Scripts** that don't need React components
- **Library authors** building on top of pod SDK

## Documentation

- **Getting Started** —
  [https://docs.v1.pod.network/](https://docs.v1.pod.network/)
- **API Reference** —
  [http://aaronbassett.github.io/pod-docs/typescript-sdk/](http://aaronbassett.github.io/pod-docs/typescript-sdk/)

## Examples

### Query Account Balance

```typescript
import { PodClient } from "@podnetwork/pod-sdk";

const client = PodClient.chronosDev();
const balance = await client.rpc.getBalance(
  "0x742d35Cc6634C0532925a3b844Bc9e7595f8e6a2"
);
console.log(`Balance: ${balance} wei`);
```

### Subscribe to New Blocks

```typescript
import { PodClient, createWsNamespace } from "@podnetwork/pod-sdk";

const client = PodClient.chronosDev();
const ws = await createWsNamespace(client.config);

const subscription = await ws.subscribeNewHeads();
subscription.on("data", (block) => {
  console.log(`New block: ${block.number}`);
});
```

### Place a CLOB Order

```typescript
import { PodClient, Wallet } from "@podnetwork/pod-sdk";

const client = PodClient.chronosDev();
const wallet = Wallet.generate();

const order = await client.orderbook.placeOrder(
  {
    marketId: "0x1234...",
    side: "buy",
    price: "1000000000000000000", // 1.0 in 18 decimals
    amount: "5000000000000000000", // 5.0 in 18 decimals
  },
  wallet
);

console.log(`Order placed: ${order.orderId}`);
```

### Type-Safe Smart Contract Call

```typescript
import { PodClient, Wallet } from "@podnetwork/pod-sdk";

const client = PodClient.chronosDev();
const wallet = Wallet.generate();

const token = client.contracts.add(
  "usdc",
  "0x1234567890123456789012345678901234567890",
  [
    {
      type: "function",
      name: "transfer",
      inputs: [
        { name: "to", type: "address" },
        { name: "amount", type: "uint256" },
      ],
      outputs: [{ name: "", type: "bool" }],
      stateMutability: "nonpayable",
    },
  ] as const
);

const tx = await token.write.transfer(
  wallet,
  "0xabcd...",
  1000000n // 1 USDC (6 decimals)
);
console.log(`Transfer sent: ${tx.hash}`);
```

### React Integration

```typescript
import { PodProvider, useBalance, useWallet } from '@podnetwork/pod-sdk';

function App() {
  return (
    <PodProvider network="chronos-dev">
      <WalletDisplay />
    </PodProvider>
  );
}

function WalletDisplay() {
  const { address, connect } = useWallet();
  const { balance } = useBalance(address);

  return (
    <div>
      {address ? (
        <p>Balance: {balance?.toString()} wei</p>
      ) : (
        <button onClick={connect}>Connect Wallet</button>
      )}
    </div>
  );
}
```

## Coming from Ethereum?

pod network is EVM-compatible with familiar developer tooling:

| Concept   | Ethereum (ethers/viem)             | pod SDK                                    |
| --------- | ---------------------------------- | ------------------------------------------ |
| Provider  | `JsonRpcProvider` / `publicClient` | `PodClient`                                |
| Balance   | `provider.getBalance()`            | `client.rpc.getBalance()`                  |
| Send TX   | `wallet.sendTransaction()`         | `client.tx.sendTransaction(tx, wallet)`    |
| Contract  | `new Contract(address, abi)`       | `client.contracts.add(name, address, abi)` |
| WebSocket | `new WebSocketProvider()`          | `createWsNamespace(config)`                |

**What's different**:

- **No mempool** — Transactions settle via batch auctions, not
  first-come-first-served
- **Sub-200ms finality** — Transactions finalize in milliseconds, not minutes
- **MEV resistant** — Batch auctions prevent frontrunning and sandwich attacks
- **WETH for gas** — pod uses WETH (wrapped Ether) for transaction fees, not a
  native token

**What's the same**:

- Standard Ethereum JSON-RPC methods
- EIP-1559 transaction format (Type 2)
- Same address format (20-byte hex with `0x` prefix)
- Same wallet format (secp256k1 private keys)
- Compatible with MetaMask and other browser wallets

## Related Resources

- **Documentation** —
  [https://docs.v1.pod.network/](https://docs.v1.pod.network/)
- **GitHub** —
  [https://github.com/pod-network/pod-sdk](https://github.com/pod-network/pod-sdk)
- **Discord** — [http://discord.gg/kB935J4hMd](http://discord.gg/kB935J4hMd)
- **Twitter** — [https://x.com/poddotnetwork](https://x.com/poddotnetwork)
- **Website** — [https://pod.network/](https://pod.network/)

## Contributing

We welcome contributions! Please see our
[Contributing Guide](../../CONTRIBUTING.md) for details.

## License

[MIT](./LICENSE) © pod network
