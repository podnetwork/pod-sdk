# @podnetwork/wallet

[![npm version](https://img.shields.io/npm/v/@podnetwork/wallet.svg)](https://www.npmjs.com/package/@podnetwork/wallet)
[![npm downloads](https://img.shields.io/npm/dm/@podnetwork/wallet.svg)](https://www.npmjs.com/package/@podnetwork/wallet)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)

Wallet management and transaction signing for pod network.

Part of the [pod network SDK](https://github.com/pod-network/pod-sdk) ·
[Documentation](https://docs.v1.pod.network/) ·
[Discord](http://discord.gg/kB935J4hMd)

## Installation

```bash
pnpm add @podnetwork/wallet ethers
```

**Peer Dependencies**: Requires `ethers ^6.0.0`

## Requirements

- Node.js >= 24
- TypeScript >= 5.7 (recommended)

## Quick Start

```typescript
import { PodClient } from "@podnetwork/core";
import { Wallet } from "@podnetwork/wallet";

// Generate a new wallet
const wallet = Wallet.generate();
console.log(`Address: ${wallet.address}`);

// Send a transaction
const client = PodClient.chronosDev();
const pending = await client.tx.sendTransaction(
  {
    to: "0x742d35Cc6634C0532925a3b844Bc9e7595f8e6a2",
    value: 1000000000000000000n, // 1 POD
  },
  wallet
);
```

## Features

- **Local Wallet** — Generate or import private key wallets
- **HD Wallet Support** — BIP-39 mnemonic phrase generation and derivation
- **Encrypted Keystores** — Web3 Secret Storage (V3) compatible keystore
  encryption
- **Browser Wallet** — MetaMask and EIP-1193 provider integration
- **Type-Safe** — Full TypeScript support with detailed types

## Usage

### Creating Wallets

```typescript
import { Wallet, Mnemonic } from "@podnetwork/wallet";

// Generate a new random wallet
const wallet = Wallet.generate();

// Import from private key
const imported = Wallet.fromPrivateKey(
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
);

// Import from mnemonic
const mnemonic = Mnemonic.generate(); // or Mnemonic.fromPhrase('...')
const hdWallet = Wallet.fromMnemonic(mnemonic, 0); // index 0
```

### Encrypted Keystores

```typescript
import { Wallet, saveKeystore, loadKeystore } from "@podnetwork/wallet";

const wallet = Wallet.generate();

// Save encrypted keystore
const keystore = await saveKeystore(wallet, "my-secure-password", {
  onProgress: (percent) =>
    console.log(`Encrypting: ${Math.round(percent * 100)}%`),
});

// Save to file (Node.js)
import { writeFile } from "fs/promises";
await writeFile(`${wallet.address}.json`, keystore);

// Load from keystore
import { readFile } from "fs/promises";
const json = await readFile("my-wallet.json", "utf8");
const { address, privateKey } = await loadKeystore(json, "my-secure-password");
const restored = Wallet.fromPrivateKey(privateKey);
```

### Browser Wallet Integration

```typescript
import { BrowserWalletSigner } from "@podnetwork/wallet";
import { PodClient } from "@podnetwork/core";

// Check if MetaMask is available
if (BrowserWalletSigner.isAvailable()) {
  // Connect to browser wallet
  const signer = await BrowserWalletSigner.connect();
  console.log(`Connected: ${signer.address}`);

  // Use with PodClient
  const client = PodClient.chronosDev();
  const pending = await client.tx.sendTransaction(
    {
      to: "0x742d35Cc6634C0532925a3b844Bc9e7595f8e6a2",
      value: 1000000000000000000n,
    },
    signer
  );
}
```

### Signing Messages

```typescript
import { Wallet } from "@podnetwork/wallet";

const wallet = Wallet.generate();

// Sign a message (EIP-191)
const signature = await wallet.signMessage("Hello, pod network!");

// Sign with bytes
const message = new TextEncoder().encode("Hello");
const sig = await wallet.signMessage(message);
```

## Security Warnings

### Private Keys in Browsers

**Do not use private keys directly in browser applications.** Private keys
stored in browser memory are vulnerable to XSS attacks and malicious scripts.

For browser applications, always use `BrowserWalletSigner` with MetaMask or
similar browser extension wallets:

```typescript
// ✅ Safe for browsers
import { BrowserWalletSigner } from "@podnetwork/wallet";
const signer = await BrowserWalletSigner.connect();

// ❌ Unsafe for browsers
import { Wallet } from "@podnetwork/wallet";
const wallet = Wallet.fromPrivateKey("0x...");
```

### Keystore Passwords

Always use strong passwords for keystore encryption. The scrypt key derivation
is intentionally slow to resist brute-force attacks, but weak passwords remain
vulnerable.

### Private Key Storage

- **Never log private keys** to console or error messages
- **Never commit private keys** to version control
- **Never transmit private keys** over insecure channels
- **Use encrypted keystores** for persistent storage

## API Reference

For complete API documentation, see the
[API Reference](http://aaronbassett.github.io/pod-docs/typescript-sdk/).

### Core Classes

- **`Wallet`** — Local private key wallet
  - `Wallet.generate()` — Generate new random wallet
  - `Wallet.fromPrivateKey(key)` — Import from private key
  - `Wallet.fromMnemonic(mnemonic, index)` — Derive from mnemonic
  - `wallet.signTransaction(tx, chainId)` — Sign transaction
  - `wallet.signMessage(message)` — Sign message

- **`Mnemonic`** — BIP-39 mnemonic phrases
  - `Mnemonic.generate(wordCount?)` — Generate 12 or 24 word mnemonic
  - `Mnemonic.fromPhrase(phrase)` — Import existing mnemonic
  - `Mnemonic.isValid(phrase)` — Validate mnemonic

- **`BrowserWalletSigner`** — Browser wallet integration
  - `BrowserWalletSigner.isAvailable()` — Check if wallet is available
  - `BrowserWalletSigner.connect()` — Connect to browser wallet
  - `signer.signTransaction(tx, chainId)` — Sign via browser wallet

### Keystore Functions

- **`saveKeystore(wallet, password, options?)`** — Encrypt wallet to keystore
  JSON
- **`loadKeystore(json, password, options?)`** — Decrypt keystore JSON
- **`isValidKeystore(json)`** — Check if JSON is valid keystore
- **`getKeystoreAddress(json)`** — Extract address without decrypting

## Coming from Ethereum?

pod network uses the same wallet format and signing algorithms as Ethereum:

| Feature         | Ethereum                        | pod  |
| --------------- | ------------------------------- | ---- |
| Address Format  | 20-byte hex (0x...)             | Same |
| Private Keys    | 32-byte secp256k1               | Same |
| HD Derivation   | BIP-44 `m/44'/60'/0'/0/{index}` | Same |
| Keystore        | Web3 Secret Storage V3          | Same |
| Message Signing | EIP-191                         | Same |

**What's different**:

- pod requires EIP-1559 transactions (Type 2) — legacy transactions are rejected
- WETH is used for gas fees (not a native token)

## Related Packages

| Package                                           | Description                                              |
| ------------------------------------------------- | -------------------------------------------------------- |
| [`@podnetwork/core`](../core)                     | Core client and types                                    |
| [`@podnetwork/wallet-browser`](../wallet-browser) | Browser wallet integration (re-exported by this package) |
| [`@podnetwork/contracts`](../contracts)           | Smart contract interactions                              |

## Contributing

We welcome contributions! Please see our
[Contributing Guide](../../CONTRIBUTING.md) for details.

## License

[MIT](./LICENSE) © pod network
