# @podnetwork/abi

[![npm version](https://img.shields.io/npm/v/@podnetwork/abi.svg)](https://www.npmjs.com/package/@podnetwork/abi)
[![npm downloads](https://img.shields.io/npm/dm/@podnetwork/abi.svg)](https://www.npmjs.com/package/@podnetwork/abi)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

ABI utilities for encoding, decoding, and managing smart contract interfaces on
pod network.

Part of the [pod network SDK](https://github.com/podnetwork/pod-sdk) ·
[Documentation](https://docs.v1.pod.network/) ·
[Discord](http://discord.gg/kB935J4hMd)

## Installation

```bash
pnpm add @podnetwork/abi
```

### Peer Dependencies

This package requires `ethers` as a peer dependency:

```bash
pnpm add ethers@^6.0.0
```

## Requirements

- Node.js >= 24
- TypeScript >= 5.3

## Quick Start

```typescript
import { CLOB_ABI, CLOB_ADDRESS, decodeEventLog } from "@podnetwork/abi";

// Decode an event log from the CLOB contract
const decoded = decodeEventLog(CLOB_ABI, log);
console.log(decoded.eventName, decoded.args);
```

## Features

- **Tree-shakeable** — Import only what you need via subpaths
- **Built-in ABIs** — Pre-bundled ABIs for pod network contracts (CLOB, Bridge,
  Optimistic Auction)
- **ERC Standard ABIs** — Common token standards (ERC-20, ERC-721, ERC-1155,
  ERC-2612, ERC-4626)
- **Type-safe** — Full TypeScript support with abitype integration
- **ABI Registry** — Address-based ABI management for decoding logs and errors
- **ABI Lookup** — Discover contract ABIs from on-chain bytecode (via whatsabi)
- **Human-readable parsing** — Convert between human-readable and JSON ABI
  formats

## Usage

### Decoding Events

```typescript
import { decodeEventLog, ERC20_ABI } from "@podnetwork/abi";

const log = {
  address: "0x...",
  topics: ["0x...", "0x...", "0x..."],
  data: "0x...",
};

const decoded = decodeEventLog(ERC20_ABI, log);
console.log(decoded.eventName); // "Transfer"
console.log(decoded.args.from, decoded.args.to, decoded.args.value);
```

### Encoding Function Calls

```typescript
import { encodeFunction, ERC20_ABI } from "@podnetwork/abi";

const calldata = encodeFunction(ERC20_ABI, "transfer", [
  "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  1000000n,
]);
// Returns: '0xa9059cbb000000000000000000000000742d35cc6634c0532925a3b844bc454e4438f44e00000000000000000000000000000000000000000000000000000000000f4240'
```

### Using pod Built-in Contracts

```typescript
import {
  CLOB_ABI,
  CLOB_ADDRESS,
  OPTIMISTIC_AUCTION_ABI,
  OPTIMISTIC_AUCTION_ADDRESS,
  POD_ADDRESSES,
} from "@podnetwork/abi";

// Access all pod contract addresses
console.log(POD_ADDRESSES.CLOB); // "0x000000000000000000000000000000000000C10B"
console.log(POD_ADDRESSES.OPTIMISTIC_AUCTION); // "0xf6D39FB8492dC21293043f5E39F566D4A4ce2206"
```

### ABI Registry for Multi-Contract Decoding

```typescript
import {
  createRegistry,
  ERC20_ABI,
  CLOB_ABI,
  CLOB_ADDRESS,
} from "@podnetwork/abi";

const registry = createRegistry();

// Register ABIs for known contracts
registry.register("0xTokenAddress...", ERC20_ABI);
registry.register(CLOB_ADDRESS, CLOB_ABI);

// Decode logs automatically using registered ABIs
const decoded = registry.decodeLog(log);
if (decoded) {
  console.log(decoded.eventName, decoded.args);
}
```

### Tree-Shakeable Imports

For optimal bundle size, import from specific subpaths:

```typescript
// Instead of importing everything
import { decodeEventLog } from "@podnetwork/abi";

// Import only what you need
import { decodeEventLog } from "@podnetwork/abi/decode";
import { encodeFunction } from "@podnetwork/abi/encode";
import { CLOB_ABI } from "@podnetwork/abi/abis/builtins";
import { ERC20_ABI } from "@podnetwork/abi/abis/common";
```

Available subpaths:

- `@podnetwork/abi/decode` — Event and error decoding
- `@podnetwork/abi/encode` — Function call encoding
- `@podnetwork/abi/parse` — Human-readable ABI parsing
- `@podnetwork/abi/utils` — Signature computation and ABI utilities
- `@podnetwork/abi/registry` — Address-based ABI management
- `@podnetwork/abi/lookup` — ABI discovery (requires `@shazow/whatsabi`)
- `@podnetwork/abi/abis/builtins` — pod network contract ABIs
- `@podnetwork/abi/abis/common` — ERC standard ABIs
- `@podnetwork/abi/schemas` — Zod schemas for validation
- `@podnetwork/abi/types` — Type definitions

## API Reference

For complete API documentation, see the
[API Reference](http://aaronbassett.github.io/pod-docs/typescript-sdk/).

### Core Functions

#### Decoding

- `decodeEventLog(abi, log)` — Decode event log
- `decodeError(abi, data)` — Decode revert error
- `decodeCalldata(abi, data)` — Decode function calldata
- `decodeReceiptLogs(abi, receipt)` — Decode all logs in a transaction receipt

#### Encoding

- `encodeFunction(abi, name, args)` — Encode function call
- `encodeConstructor(abi, args)` — Encode constructor parameters
- `getFunctionSelector(abi, name)` — Get 4-byte function selector

#### Utilities

- `parseAbi(humanReadable)` — Parse human-readable ABI to JSON
- `formatAbi(abi)` — Format JSON ABI to human-readable strings
- `computeSelector(signature)` — Compute selector from signature
- `diffAbis(oldAbi, newAbi)` — Compare two ABIs for breaking changes

### Built-in ABIs

#### pod network Contracts

| Export                   | Description              | Address Constant             |
| ------------------------ | ------------------------ | ---------------------------- |
| `CLOB_ABI`               | Central Limit Order Book | `CLOB_ADDRESS`               |
| `OPTIMISTIC_AUCTION_ABI` | Batch auction settlement | `OPTIMISTIC_AUCTION_ADDRESS` |
| `BRIDGE_ABI`             | Cross-chain bridge       | `BRIDGE_ADDRESS`             |
| `POD_ERC20_ABI`          | pod ERC-20 token         | `NATIVE_TOKEN_ADDRESS`       |

#### ERC Standards

- `ERC20_ABI` — ERC-20 fungible token standard
- `ERC721_ABI` — ERC-721 NFT standard
- `ERC1155_ABI` — ERC-1155 multi-token standard
- `ERC2612_ABI` — ERC-20 permit extension (gasless approvals)
- `ERC4626_ABI` — Tokenized vault standard

## Coming from Ethereum?

This package provides familiar ABI utilities similar to ethers.js and viem:

| Concept         | ethers.js                       | viem                      | @podnetwork/abi                   |
| --------------- | ------------------------------- | ------------------------- | --------------------------------- |
| Decode event    | `iface.parseLog(log)`           | `decodeEventLog(...)`     | `decodeEventLog(abi, log)`        |
| Encode function | `iface.encodeFunctionData(...)` | `encodeFunctionData(...)` | `encodeFunction(abi, name, args)` |
| Parse ABI       | `new Interface(abi)`            | `parseAbi(...)`           | `parseAbi(strings)`               |
| Get selector    | `iface.getSighash(name)`        | `toFunctionSelector(...)` | `getFunctionSelector(abi, name)`  |

Key differences:

- **ABI-first design** — Functions accept the ABI directly, no need to create an
  Interface instance
- **Built-in pod contracts** — Pre-bundled ABIs for CLOB, bridge, and auction
  contracts
- **Tree-shakeable** — Import only what you need via subpaths

## Related Packages

| Package                                 | Description                     |
| --------------------------------------- | ------------------------------- |
| [`@podnetwork/core`](../core)           | Core client and RPC methods     |
| [`@podnetwork/contracts`](../contracts) | Type-safe contract interactions |
| [`@podnetwork/orderbook`](../orderbook) | CLOB trading client             |
| [`@podnetwork/auction`](../auction)     | Batch auction participation     |

## Contributing

We welcome contributions! Please see our
[Contributing Guide](../../CONTRIBUTING.md) for details.

## License

[MIT](./LICENSE) © pod network
