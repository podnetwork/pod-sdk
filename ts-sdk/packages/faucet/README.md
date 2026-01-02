# @podnetwork/faucet

[![npm version](https://img.shields.io/npm/v/@podnetwork/faucet.svg)](https://www.npmjs.com/package/@podnetwork/faucet)
[![npm downloads](https://img.shields.io/npm/dm/@podnetwork/faucet.svg)](https://www.npmjs.com/package/@podnetwork/faucet)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

Request testnet tokens from the pod network faucet for development and testing.

Part of the [pod network SDK](https://github.com/podnetwork/pod-sdk) ·
[Documentation](https://docs.v1.pod.network/) ·
[Discord](http://discord.gg/kB935J4hMd)

## Installation

```bash
pnpm add @podnetwork/faucet
```

This package has a peer dependency on `@podnetwork/core`:

```bash
pnpm add @podnetwork/core @podnetwork/faucet
```

## Requirements

- Node.js >= 24
- TypeScript >= 5.3 (for TypeScript projects)

## Quick Start

```typescript
import { createFaucetNamespace } from "@podnetwork/faucet";

// Create faucet client
const faucet = createFaucetNamespace({
  url: "https://faucet.chronos.pod.network",
  timeout: 30000,
  maxRetries: 3,
});

// Request testnet tokens (funds WETH for gas)
const response = await faucet.fund("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb");
console.log(`Funded with ${response.txHashes.length} transactions`);
```

## Features

- Request testnet tokens (WETH for gas) with a single method call
- Automatic retry logic with exponential backoff
- Built-in rate limit handling with wait time information
- Type-safe error handling with detailed error codes
- Address validation before requests

## Usage

### Basic Token Request

```typescript
import { createFaucetNamespace } from "@podnetwork/faucet";

const faucet = createFaucetNamespace({
  url: "https://faucet.chronos.pod.network",
  timeout: 30000,
  maxRetries: 3,
});

try {
  const response = await faucet.fund(
    "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  );

  console.log(`Success! Received ${response.txHashes.length} transactions:`);
  for (const txHash of response.txHashes) {
    console.log(`  ${txHash}`);
  }
} catch (error) {
  console.error("Failed to request tokens:", error);
}
```

### Error Handling

The faucet uses typed errors from `@podnetwork/core` for detailed error
information:

```typescript
import { createFaucetNamespace, PodFundingError } from "@podnetwork/faucet";

const faucet = createFaucetNamespace({
  url: "https://faucet.chronos.pod.network",
  timeout: 30000,
  maxRetries: 3,
});

try {
  const response = await faucet.fund(address);
  console.log("Tokens received!");
} catch (error) {
  if (error instanceof PodFundingError) {
    switch (error.code) {
      case "POD_2005": // FAUCET_RATE_LIMITED
        const waitMinutes = Math.ceil((error.waitTime ?? 0) / 60000);
        console.log(`Rate limited. Try again in ${waitMinutes} minutes.`);
        break;

      case "POD_2006": // FAUCET_UNAVAILABLE
        console.log("Faucet temporarily unavailable. Try again later.");
        break;

      case "POD_2007": // FAUCET_REQUEST_FAILED
        console.log(`Request failed: ${error.message}`);
        break;
    }
  }
}
```

### Using with PodClient

The faucet is typically used alongside `PodClient` from `@podnetwork/core`:

```typescript
import { PodClient } from "@podnetwork/core";
import { LocalWallet } from "@podnetwork/wallet";
import { createFaucetNamespace } from "@podnetwork/faucet";

// Connect to pod network
const client = PodClient.chronosDev();
const wallet = LocalWallet.createRandom();

// Request testnet tokens
const faucet = createFaucetNamespace({
  url: "https://faucet.chronos.pod.network",
  timeout: 30000,
  maxRetries: 3,
});

const response = await faucet.fund(wallet.address);
console.log(`Funded ${wallet.address}`);

// Check balance
const balance = await client.rpc.getBalance(wallet.address);
console.log(`Balance: ${balance} wei`);
```

### Custom Configuration

```typescript
import { createFaucetNamespace } from "@podnetwork/faucet";

// Configure with custom timeout and retry settings
const faucet = createFaucetNamespace({
  url: "https://faucet.chronos.pod.network",
  timeout: 60000, // 60 second timeout
  maxRetries: 5, // Retry up to 5 times
});
```

## API Reference

### `createFaucetNamespace(config)`

Creates a new faucet client instance.

**Parameters:**

- `config.url` — Faucet API base URL (e.g.,
  `https://faucet.chronos.pod.network`)
- `config.timeout` — Request timeout in milliseconds
- `config.maxRetries` — Maximum number of retry attempts

**Returns:** `FaucetNamespace` instance

### `faucet.fund(address)`

Requests testnet tokens for the specified address.

**Parameters:**

- `address` — Ethereum address to fund (validates format)

**Returns:** `Promise<FaucetResponse>`

- `txHashes` — Array of transaction hashes for the funding transactions

**Throws:**

- `PodFundingError` with code `POD_2005` if rate limited
- `PodFundingError` with code `POD_2006` if service unavailable
- `PodFundingError` with code `POD_2007` if request failed

### Error Codes

| Code       | Name                    | Description                                                |
| ---------- | ----------------------- | ---------------------------------------------------------- |
| `POD_2005` | `FAUCET_RATE_LIMITED`   | Too many requests. Check `error.waitTime` for retry delay. |
| `POD_2006` | `FAUCET_UNAVAILABLE`    | Service temporarily unavailable.                           |
| `POD_2007` | `FAUCET_REQUEST_FAILED` | Request failed (invalid address, network error, etc.).     |

For complete API documentation, see the
[API Reference](http://aaronbassett.github.io/pod-docs/typescript-sdk/).

## Coming from Ethereum?

pod network testnet faucets work similarly to Ethereum testnet faucets, but with
some differences:

| Aspect         | Ethereum Testnets  | pod network                   |
| -------------- | ------------------ | ----------------------------- |
| Token type     | Native testnet ETH | WETH (for gas)                |
| Request method | Web UI or API      | Programmatic API via SDK      |
| Rate limiting  | Per IP or address  | Per address with typed errors |
| Funding speed  | Varies by network  | Sub-200ms confirmation        |

**Key differences:**

- **No native token** — pod network doesn't have a native token like ETH. The
  faucet provides WETH which is used for gas fees.
- **Instant finality** — Faucet transactions confirm in under 200ms, no need to
  wait for multiple blocks.
- **Type-safe errors** — Rate limiting and errors are returned as typed
  `PodFundingError` instances with structured information.

## Related Packages

| Package                           | Description                                      |
| --------------------------------- | ------------------------------------------------ |
| [`@podnetwork/core`](../core)     | Core pod network client and RPC methods          |
| [`@podnetwork/wallet`](../wallet) | Local wallet management for signing transactions |

## Contributing

We welcome contributions! Please see our
[Contributing Guide](../../CONTRIBUTING.md) for details.

## License

[MIT](./LICENSE) © pod network
