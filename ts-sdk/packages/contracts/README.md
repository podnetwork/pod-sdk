# @podnetwork/contracts

[![npm version](https://img.shields.io/npm/v/@podnetwork/contracts.svg)](https://www.npmjs.com/package/@podnetwork/contracts)
[![npm downloads](https://img.shields.io/npm/dm/@podnetwork/contracts.svg)](https://www.npmjs.com/package/@podnetwork/contracts)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)

Type-safe smart contract interactions for pod network with full TypeScript
inference from ABI definitions.

Part of the [pod network SDK](https://github.com/podnetwork/pod-sdk) ·
[Documentation](https://docs.v1.pod.network/) ·
[Discord](http://discord.gg/kB935J4hMd)

## Installation

```bash
pnpm add @podnetwork/contracts @podnetwork/core ethers
```

**Peer dependencies**: ethers v6.0.0+

## Requirements

- Node.js 24+
- TypeScript 5.7+ (for full type inference)
- pnpm 9.15+

## Quick Start

```typescript
import { PodClient } from "@podnetwork/core";

const client = PodClient.chronosDev();

// Register a contract with full type inference
const token = client.contracts.add(
  "myToken",
  "0x1234567890123456789012345678901234567890",
  [
    {
      type: "function",
      name: "balanceOf",
      inputs: [{ name: "account", type: "address" }],
      outputs: [{ name: "", type: "uint256" }],
      stateMutability: "view",
    },
  ] as const
);

// Type-safe read call
const balance = await token.read.balanceOf("0xabcd...");
console.log(balance);
```

## Features

- **Full Type Inference** — TypeScript types inferred from ABI definitions using
  abitype
- **Namespace-based API** — Clean separation of read/write operations via
  `contract.read.*` and `contract.write.*`
- **ABI Extraction CLI** — Extract ABIs from Foundry/Hardhat artifacts or
  compile Solidity files directly
- **Contract Registry** — Manage multiple contracts through `client.contracts`
  namespace
- **Event Decoding** — Decode contract events with typed arguments
- **Error Handling** — Detailed error messages with revert reason extraction

## Usage

### Registering Contracts

```typescript
import { PodClient } from "@podnetwork/core";
import { erc20Abi } from "./abis/erc20.js";

const client = PodClient.chronosDev();

// Add a contract to the registry
const usdc = client.contracts.add(
  "usdc",
  "0x1234567890123456789012345678901234567890",
  erc20Abi
);

// Get a registered contract
const token = client.contracts.get("usdc");

// Check if contract exists
if (client.contracts.has("usdc")) {
  console.log("USDC contract registered");
}

// List all contracts
const names = client.contracts.list();
console.log("Registered contracts:", names);
```

### Read Operations

```typescript
import { LocalWallet } from "@podnetwork/wallet";

const wallet = LocalWallet.createRandom();
const client = PodClient.chronosDev();

const token = client.contracts.add("usdc", "0x...", erc20Abi);

// Read methods are fully typed based on ABI
const balance = await token.read.balanceOf(wallet.address);
const name = await token.read.name();
const decimals = await token.read.decimals();

console.log(`Balance: ${balance} ${name}`);
```

### Write Operations

```typescript
import { LocalWallet } from "@podnetwork/wallet";

const wallet = LocalWallet.createRandom();
const client = PodClient.chronosDev();

const token = client.contracts.add("usdc", "0x...", erc20Abi);

// Write methods require a signer
const recipient = "0xabcdef1234567890abcdef1234567890abcdef12";
const amount = 1000000n; // 1 USDC (6 decimals)

const tx = await token.write.transfer(wallet, recipient, amount);
console.log("Transaction hash:", tx.hash);

// Wait for transaction confirmation
const receipt = await tx.wait();
console.log("Confirmed in block:", receipt.blockNumber);
```

### Extracting ABIs from Build Artifacts

The package includes a CLI tool for extracting ABIs from Foundry or Hardhat
build artifacts:

```bash
# Extract from a single Foundry artifact
pnpm extract-abi ./out/MyContract.sol/MyContract.json -o ./src/abis/

# Extract from multiple artifacts with glob pattern
pnpm extract-abi './out/**/*.json' -o ./src/abis/

# Compile Solidity file directly (requires Foundry)
pnpm extract-abi ./contracts/MyToken.sol -o ./src/abis/

# Skip generating barrel file (index.ts)
pnpm extract-abi './out/**/*.json' -o ./src/abis/ --no-barrel
```

The CLI generates TypeScript files with properly typed ABI exports:

```typescript
// Generated: src/abis/myToken.ts
export const myTokenAbi = [
  /* ... */
] as const;
```

### Event Decoding

```typescript
import type { ContractLog } from "@podnetwork/contracts";

const token = client.contracts.add("usdc", "0x...", erc20Abi);

// Decode event from log
const log: ContractLog = {
  address: "0x1234567890123456789012345678901234567890",
  topics: [
    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
    /* ... */
  ],
  data: "0x...",
  blockNumber: 12345n,
  transactionHash: "0xabc...",
  logIndex: 0,
};

const event = token.decodeEvent(log);
console.log("Event:", event.name);
console.log("Arguments:", event.args);
```

### Contract Events with WebSockets

```typescript
import { PodWsClient } from "@podnetwork/ws";

const wsClient = await PodWsClient.chronosDev();
const token = client.contracts.add("usdc", "0x...", erc20Abi);

// Subscribe to Transfer events
const filter = token.eventFilter("Transfer");
const subscription = await wsClient.subscribeLogs(filter);

subscription.on("data", (log) => {
  const event = token.decodeEvent(log);
  console.log("Transfer:", event.args);
});
```

## API Reference

For complete API documentation, see the
[API Reference](http://aaronbassett.github.io/pod-docs/typescript-sdk/).

### Main Exports

- `TypedContract` — Type-safe contract interaction class with read/write methods
- `ContractsNamespace` — Contract registry for managing multiple contracts
- `PendingContractTransaction` — Transaction wrapper with wait() method
- ABI schemas and validation utilities
- Error classes for contract-specific errors

## Coming from Ethereum?

If you're familiar with ethers.js or viem, here's how pod contracts compare:

| Concept           | ethers.js                              | pod SDK                                       |
| ----------------- | -------------------------------------- | --------------------------------------------- |
| Contract instance | `new Contract(address, abi, provider)` | `client.contracts.add(name, address, abi)`    |
| Read method       | `contract.balanceOf(address)`          | `contract.read.balanceOf(address)`            |
| Write method      | `contract.transfer(to, amount)`        | `contract.write.transfer(wallet, to, amount)` |
| Event filter      | `contract.filters.Transfer()`          | `contract.eventFilter("Transfer")`            |
| Decode event      | `contract.interface.parseLog(log)`     | `contract.decodeEvent(log)`                   |

**Key differences**:

- **Namespace-based API** — Read and write methods are separated into
  `contract.read.*` and `contract.write.*`
- **Explicit signer** — Write methods require passing a wallet/signer as the
  first argument
- **Contract registry** — Contracts are registered with names for easy retrieval
- **Built-in type inference** — TypeScript types are automatically inferred from
  ABI definitions

## Related Packages

| Package                                                                  | Description                     |
| ------------------------------------------------------------------------ | ------------------------------- |
| [`@podnetwork/core`](https://www.npmjs.com/package/@podnetwork/core)     | Core client and RPC methods     |
| [`@podnetwork/wallet`](https://www.npmjs.com/package/@podnetwork/wallet) | Local wallet for signing        |
| [`@podnetwork/abi`](https://www.npmjs.com/package/@podnetwork/abi)       | ABI encoding/decoding utilities |
| [`@podnetwork/ws`](https://www.npmjs.com/package/@podnetwork/ws)         | WebSocket subscriptions         |

## Contributing

We welcome contributions! Please see our
[Contributing Guide](../../CONTRIBUTING.md) for details.

## License

[MIT](./LICENSE) © pod network
