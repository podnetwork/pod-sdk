# @podnetwork/wallet-browser

[![npm version](https://img.shields.io/npm/v/@podnetwork/wallet-browser.svg)](https://www.npmjs.com/package/@podnetwork/wallet-browser)
[![npm downloads](https://img.shields.io/npm/dm/@podnetwork/wallet-browser.svg)](https://www.npmjs.com/package/@podnetwork/wallet-browser)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

Browser wallet integration for pod network — connect to MetaMask, Coinbase
Wallet, and other EIP-1193 compatible wallets.

Part of the [pod network SDK](https://github.com/pod-network/pod-sdk) ·
[Documentation](https://docs.v1.pod.network/) ·
[Discord](http://discord.gg/kB935J4hMd)

## Installation

```bash
pnpm add @podnetwork/wallet-browser @podnetwork/core
```

**Peer Dependencies**: Requires `@podnetwork/core` for types and utilities.

## Requirements

- **Browser**: Modern browsers with ES2022+ support
- **Wallet**: MetaMask, Coinbase Wallet, or any EIP-1193 compatible wallet
- **TypeScript**: 5.7+ (recommended)

## Quick Start

```typescript
import { BrowserWalletSigner } from "@podnetwork/wallet-browser";
import { PodClient } from "@podnetwork/core";

// Check if browser wallet is available
if (BrowserWalletSigner.isAvailable()) {
  // Connect to wallet (prompts user)
  const signer = await BrowserWalletSigner.connect();
  console.log(`Connected: ${await signer.getAddress()}`);

  // Send a transaction
  const client = PodClient.chronosDev();
  const pending = await client.tx.sendTransaction(
    {
      to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
      value: 1000000000000000000n, // 1 POD
    },
    signer
  );

  console.log(`Transaction: ${pending.hash}`);
}
```

## Features

- **Minimal Bundle Size** — No ethers.js dependency, uses native browser wallet
  APIs
- **Security First** — Private keys never leave the user's wallet extension
- **Type-Safe** — Full TypeScript support with inferred types
- **User-Friendly** — Clean wallet prompts using `eth_sendTransaction` instead
  of raw signing
- **Network Management** — Add pod networks to wallets with one function call
- **EIP-1193 Compliant** — Works with MetaMask, Coinbase Wallet, and other
  standard wallets

## Usage

### Connecting to a Wallet

```typescript
import { BrowserWalletSigner } from "@podnetwork/wallet-browser";

// Check availability first
if (!BrowserWalletSigner.isAvailable()) {
  console.error("Please install MetaMask or a compatible wallet");
  return;
}

// Connect (prompts user to approve)
try {
  const signer = await BrowserWalletSigner.connect();
  console.log(`Connected: ${signer.address}`);
} catch (error) {
  console.error("User rejected connection");
}
```

### Sending Transactions

```typescript
import { BrowserWalletSigner } from "@podnetwork/wallet-browser";
import { PodClient } from "@podnetwork/core";

const signer = await BrowserWalletSigner.connect();
const client = PodClient.chronosDev();

// Send transaction - wallet handles gas estimation and nonce
const pending = await client.tx.sendTransaction(
  {
    to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
    value: 1000000000000000000n,
  },
  signer
);

// Wait for finality (sub-200ms on pod)
const receipt = await pending.wait();
console.log(`Transaction confirmed: ${receipt.transactionHash}`);
```

### Signing Messages

```typescript
const signer = await BrowserWalletSigner.connect();

// Sign a message (EIP-191 personal_sign)
const signature = await signer.signMessage("Hello, pod!");
console.log(`Signature: ${signature}`);

// Sign raw bytes
const bytes = new Uint8Array([1, 2, 3, 4]);
const bytesSignature = await signer.signMessage(bytes);
```

### Adding pod Network to Wallet

Help users add pod network to their MetaMask with one function call:

```typescript
import {
  addPodNetworkToWallet,
  POD_CHRONOS_DEV_NETWORK,
} from "@podnetwork/wallet-browser";

// Add Chronos devnet (recommended)
const result = await addPodNetworkToWallet(POD_CHRONOS_DEV_NETWORK);

if (result.success) {
  console.log("Network added and switched!");
} else {
  console.error(result.error);
}
```

Available network presets:

- `POD_CHRONOS_DEV_NETWORK` — Chronos devnet (most up-to-date, includes
  CLOB/auction)
- `POD_DEV_NETWORK` — Standard devnet

### Checking Network Status

```typescript
import {
  getCurrentChainId,
  isConnectedToPodNetwork,
  POD_CHRONOS_DEV_NETWORK,
} from "@podnetwork/wallet-browser";

// Get current chain ID
const chainId = await getCurrentChainId();
console.log(`Connected to chain ${chainId}`);

// Check if on pod network
if (await isConnectedToPodNetwork(POD_CHRONOS_DEV_NETWORK)) {
  console.log("Ready to transact on pod!");
} else {
  console.log("Please switch to pod network");
}
```

### Advanced: Custom Provider

Use a custom EIP-1193 provider instead of `window.ethereum`:

```typescript
import { BrowserWalletSigner } from "@podnetwork/wallet-browser";

// Example: WalletConnect or custom provider
const customProvider = getWalletConnectProvider();

const signer = await BrowserWalletSigner.connect({
  provider: customProvider,
  accountIndex: 0, // Use first account
});
```

### Lifecycle Management

Clean up resources when done:

```typescript
const signer = await BrowserWalletSigner.connect();

// Use signer...

// Clean up (removes event listeners)
signer.disconnect();
```

## API Reference

For complete API documentation, see the
[API Reference](http://aaronbassett.github.io/pod-docs/typescript-sdk/).

### Main Exports

- **`BrowserWalletSigner`** — EIP-1193 browser wallet signer
  - `static connect(options?)` — Connect to wallet
  - `static isAvailable(options?)` — Check if wallet is available
  - `getAddress()` — Get connected address
  - `signMessage(message)` — Sign a message
  - `sendTransaction(tx, chainId)` — Send transaction via wallet
  - `disconnect()` — Clean up resources

- **Network Management**
  - `addPodNetworkToWallet(config?, provider?)` — Add and switch to pod network
  - `switchToPodNetwork(config?, provider?)` — Switch to pod network (no add)
  - `getCurrentChainId(provider?)` — Get current chain ID
  - `isConnectedToPodNetwork(config?, provider?)` — Check if on pod network
  - `isBrowserWalletAvailable(provider?)` — Check wallet availability

- **Network Presets**
  - `POD_CHRONOS_DEV_NETWORK` — Chronos devnet config
  - `POD_DEV_NETWORK` — Standard devnet config

### Types

```typescript
interface EIP1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
}

interface BrowserWalletConnectOptions {
  provider?: EIP1193Provider;
  accountIndex?: number;
}

interface PodNetworkConfig {
  chainId: bigint;
  chainName: string;
  rpcUrl: string;
  wsUrl?: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrl?: string;
}
```

## Coming from Ethereum?

If you're familiar with ethers.js or viem, here's how
`@podnetwork/wallet-browser` compares:

### What's Different

- **No ethers.js** — This package uses native browser APIs (EIP-1193) directly,
  resulting in a much smaller bundle size
- **`eth_sendTransaction` not `eth_signTransaction`** — The wallet handles gas
  estimation, nonce management, and broadcasting, giving users a cleaner UX
- **Sub-200ms finality** — On pod, transactions confirm in milliseconds, not
  minutes
- **Built-in network helpers** — Add pod networks to wallets with one function
  call

### What's Similar

- **Same wallet interface** — Works with MetaMask, Coinbase Wallet, and any
  EIP-1193 compatible wallet
- **Same transaction format** — Standard Ethereum transaction objects
- **Same address format** — 0x-prefixed hex addresses work identically
- **TypeScript first** — Full type safety like ethers v6

### API Mapping

| Concept        | Ethereum (ethers/viem)             | pod SDK                                 |
| -------------- | ---------------------------------- | --------------------------------------- |
| Browser signer | `BrowserProvider` / `walletClient` | `BrowserWalletSigner`                   |
| Connect        | `provider.getSigner()`             | `BrowserWalletSigner.connect()`         |
| Get address    | `signer.getAddress()`              | `signer.getAddress()`                   |
| Send TX        | `signer.sendTransaction()`         | `client.tx.sendTransaction(tx, signer)` |
| Sign message   | `signer.signMessage()`             | `signer.signMessage()`                  |
| Add network    | Manual setup                       | `addPodNetworkToWallet()`               |

## Related Packages

| Package                           | Description                                   |
| --------------------------------- | --------------------------------------------- |
| [`@podnetwork/core`](../core)     | Core client, RPC, and types (required)        |
| [`@podnetwork/wallet`](../wallet) | Node.js wallet with mnemonic/keystore support |
| [`@podnetwork/react`](../react)   | React hooks including `useBrowserWallet()`    |

## Contributing

We welcome contributions! Please see our
[Contributing Guide](../../CONTRIBUTING.md) for details.

## License

[MIT](./LICENSE) © pod network
