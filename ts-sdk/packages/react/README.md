# @podnetwork/react

[![npm version](https://img.shields.io/npm/v/@podnetwork/react.svg)](https://www.npmjs.com/package/@podnetwork/react)
[![npm downloads](https://img.shields.io/npm/dm/@podnetwork/react.svg)](https://www.npmjs.com/package/@podnetwork/react)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)

React hooks and headless components for pod network.

Part of the [pod network SDK](https://github.com/pod-network/pod-sdk) ·
[Documentation](https://docs.v1.pod.network/) ·
[Discord](http://discord.gg/kB935J4hMd)

## Installation

```bash
pnpm add @podnetwork/react react react-dom
```

**Peer Dependencies**: Requires `react ^18.0.0` and `react-dom ^18.0.0`

## Requirements

- Node.js >= 24
- TypeScript >= 5.7 (recommended)
- React >= 18.0.0

## Quick Start

```typescript
import { PodProvider, useWallet, Hash } from '@podnetwork/react';

function App() {
  return (
    <PodProvider network="chronos-dev">
      <WalletButton />
    </PodProvider>
  );
}

function WalletButton() {
  const { isConnected, address, connect, disconnect } = useWallet();

  if (isConnected && address) {
    return (
      <div>
        <Hash.Root value={address} truncate="middle" chars={6}>
          <Hash.Truncated className="font-mono" />
          <Hash.Copy>Copy</Hash.Copy>
        </Hash.Root>
        <button onClick={disconnect}>Disconnect</button>
      </div>
    );
  }

  return (
    <button onClick={() => connect({ type: "browser" })}>
      Connect Wallet
    </button>
  );
}
```

## Features

- **React Hooks** — Access pod client, wallet, balances, transactions, and more
- **Headless Components** — Unstyled, accessible components for common patterns
- **WebSocket Subscriptions** — Real-time orderbook and auction data
- **Type-Safe** — Full TypeScript support with detailed types
- **SSR Compatible** — Safe for Next.js and other SSR frameworks

## Usage

### Provider Setup

Wrap your app with `PodProvider` to provide pod client and wallet context:

```typescript
import { PodProvider } from '@podnetwork/react';

function App() {
  return (
    <PodProvider network="chronos-dev">
      <YourApp />
    </PodProvider>
  );
}
```

Available networks: `"chronos-dev"`, `"dev"`, `"local"`

### Wallet Management

```typescript
import { useWallet } from '@podnetwork/react';

function WalletStatus() {
  const {
    status,      // "disconnected" | "connecting" | "connected"
    isConnected,
    address,
    connect,
    disconnect,
  } = useWallet();

  const handleConnect = async () => {
    try {
      await connect({ type: "browser" }); // MetaMask, etc.
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  return (
    <div>
      {isConnected ? (
        <>
          <p>Connected: {address}</p>
          <button onClick={disconnect}>Disconnect</button>
        </>
      ) : (
        <button onClick={handleConnect}>Connect Wallet</button>
      )}
    </div>
  );
}
```

### Reading Blockchain Data

```typescript
import { useBalance, useTransaction, useChainId } from '@podnetwork/react';

function AccountInfo({ address }: { address: string }) {
  const { data: balance, isLoading, error } = useBalance({ address });
  const { data: chainId } = useChainId();

  if (isLoading) return <div>Loading balance...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <p>Chain ID: {chainId}</p>
      <p>Balance: {balance?.toString()} wei</p>
    </div>
  );
}

function TransactionStatus({ hash }: { hash: string }) {
  const { data: receipt, isLoading } = useTransaction({ hash });

  if (isLoading) return <div>Loading transaction...</div>;
  if (!receipt) return <div>Transaction not found</div>;

  return (
    <div>
      <p>Status: {receipt.status === 1n ? 'Success' : 'Failed'}</p>
      <p>Block: {receipt.blockNumber?.toString()}</p>
      <p>Gas Used: {receipt.gasUsed?.toString()}</p>
    </div>
  );
}
```

### WebSocket Subscriptions

```typescript
import { useOrderbook, useBids } from '@podnetwork/react';

function OrderbookView({ baseToken, quoteToken }: { baseToken: string; quoteToken: string }) {
  const {
    data: orderbook,
    connectionState,
    error,
  } = useOrderbook({
    baseToken,
    quoteToken,
  });

  if (connectionState === 'connecting') return <div>Connecting...</div>;
  if (connectionState === 'disconnected') return <div>Disconnected</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <p>Best Bid: {orderbook?.bids[0]?.price}</p>
      <p>Best Ask: {orderbook?.asks[0]?.price}</p>
    </div>
  );
}

function AuctionBids() {
  const { data: bids, connectionState } = useBids();

  return (
    <div>
      <p>Status: {connectionState}</p>
      <ul>
        {bids.map((bid, i) => (
          <li key={i}>
            Price: {bid.price}, Size: {bid.size}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Headless Components

All components follow the headless pattern — they provide logic and state
without styling:

```typescript
import { Hash, Address, Transaction, TokenAmount } from '@podnetwork/react';

function TransactionCard({ hash }: { hash: string }) {
  return (
    <Transaction.Root hash={hash}>
      <div className="card">
        <div className="header">
          <Transaction.Hash truncate="middle" className="mono" />
          <Transaction.Status className="badge" />
        </div>
        <div className="details">
          <div>
            <label>From</label>
            <Transaction.From />
          </div>
          <div>
            <label>To</label>
            <Transaction.To />
          </div>
          <div>
            <label>Value</label>
            <Transaction.Value />
          </div>
        </div>
      </div>
    </Transaction.Root>
  );
}
```

### Hash Display with Copy

```typescript
import { Hash } from '@podnetwork/react';

function AddressDisplay({ address }: { address: string }) {
  return (
    <Hash.Root value={address} truncate="middle" chars={6}>
      <Hash.Truncated className="font-mono text-sm" />
      <Hash.Copy className="btn-icon">
        📋
      </Hash.Copy>
    </Hash.Root>
  );
}
```

The copy button automatically handles clipboard interaction and exposes state
via `data-state` attribute:

```css
/* Style based on copy state */
[data-state="idle"] {
  opacity: 1;
}
[data-state="copying"] {
  opacity: 0.6;
  cursor: wait;
}
[data-state="copied"] {
  color: green;
}
[data-state="error"] {
  color: red;
}
```

### Token Amount Formatting

```typescript
import { TokenAmount } from '@podnetwork/react';

function BalanceDisplay({ balance }: { balance: bigint }) {
  return (
    <TokenAmount.Root value={balance} decimals={18}>
      <TokenAmount.Value />
      <TokenAmount.Symbol>WETH</TokenAmount.Symbol>
    </TokenAmount.Root>
  );
}
```

### Finalization Status

```typescript
import { FinalizationStatus } from '@podnetwork/react';

function BlockFinalization({ blockNumber }: { blockNumber: bigint }) {
  return (
    <FinalizationStatus.Root blockNumber={blockNumber}>
      <div className="finalization">
        <FinalizationStatus.Badge className="badge" />
        <FinalizationStatus.Progress className="progress-bar" />
        <FinalizationStatus.Percentage />
        <FinalizationStatus.AttestationCount />
        <FinalizationStatus.ElapsedTime />
      </div>
    </FinalizationStatus.Root>
  );
}
```

Status is exposed via `data-status` attribute for styling:

```css
[data-status="pending"] {
  background: #fff3cd;
}
[data-status="attesting"] {
  background: #cce5ff;
}
[data-status="finalized"] {
  background: #d4edda;
}
```

### Using asChild Pattern

Components support the `asChild` pattern to merge props with your own elements:

```typescript
import { Hash } from '@podnetwork/react';

function ExplorerLink({ hash }: { hash: string }) {
  return (
    <Hash.Root value={hash} asChild>
      <a href={`https://explorer.pod.network/tx/${hash}`} className="link">
        <Hash.Truncated />
        <span>→</span>
      </a>
    </Hash.Root>
  );
}
```

## API Reference

For complete API documentation, see the
[API Reference](http://aaronbassett.github.io/pod-docs/typescript-sdk/).

### Providers

- **`PodProvider`** — Root provider for pod client and wallet context
- **`ClientProvider`** — Low-level client provider (wrapped by PodProvider)
- **`WalletProvider`** — Low-level wallet provider (wrapped by PodProvider)

### Hooks

#### Wallet & Account

- **`useWallet()`** — Wallet connection and management
- **`useBalance(options)`** — Query account balance
- **`useFaucet(options)`** — Request testnet funds

#### Transactions

- **`useTransaction(options)`** — Query transaction receipt
- **`useGasPrice(options)`** — Query current gas price
- **`useEstimateGas(options)`** — Estimate transaction gas

#### Network

- **`useChainId(options)`** — Query chain ID
- **`useCommittee(options)`** — Query validator committee

#### Orderbook & Auctions

- **`useOrderbook(options)`** — WebSocket orderbook subscription
- **`useBids(options)`** — WebSocket auction bids subscription
- **`useAuction(options)`** — Auction status and participation

#### Block Finalization

- **`useFinalizationStatus(options)`** — Track block finalization progress

### Components

All components are headless and support the `asChild` pattern via Radix UI's
Slot component.

#### Hash

- **`Hash.Root`** — Context provider for hash value
- **`Hash.Truncated`** — Display truncated hash
- **`Hash.Full`** — Display full hash
- **`Hash.Copy`** — Copy hash to clipboard

#### Address

- **`Address.Root`** — Context provider for address
- **`Address.Truncated`** — Display truncated address
- **`Address.Copy`** — Copy address to clipboard

#### Transaction

- **`Transaction.Root`** — Context provider for transaction hash
- **`Transaction.Hash`** — Display transaction hash
- **`Transaction.Status`** — Display transaction status badge
- **`Transaction.Receipt`** — Display receipt data
- **`Transaction.Value`** — Display transaction value
- **`Transaction.From`** — Display sender address
- **`Transaction.To`** — Display recipient address
- **`Transaction.GasUsed`** — Display gas used
- **`Transaction.BlockNumber`** — Display block number

#### TransactionList

- **`TransactionList.Root`** — Context provider for transaction list
- **`TransactionList.Item`** — Individual transaction item
- **`TransactionList.Count`** — Display transaction count
- **`TransactionList.Empty`** — Empty state
- **`TransactionList.Loading`** — Loading state

#### TokenAmount

- **`TokenAmount.Root`** — Context provider for token amount
- **`TokenAmount.Value`** — Display formatted token value
- **`TokenAmount.Symbol`** — Display token symbol

#### Timestamp

- **`Timestamp.Root`** — Context provider for timestamp
- **`Timestamp.Relative`** — Display relative time (e.g., "2 minutes ago")
- **`Timestamp.Absolute`** — Display absolute timestamp

#### Orderbook

- **`Orderbook.Root`** — Context provider for orderbook data
- **`Orderbook.Bids`** — Display bid levels
- **`Orderbook.Asks`** — Display ask levels
- **`Orderbook.Spread`** — Display bid-ask spread
- **`Orderbook.BestBid`** — Display best bid price
- **`Orderbook.BestAsk`** — Display best ask price
- **`Orderbook.Depth`** — Display market depth

#### Committee

- **`Committee.Root`** — Context provider for committee data
- **`Committee.Validators`** — Display validator list
- **`Committee.QuorumSize`** — Display quorum size
- **`Committee.TotalValidators`** — Display total validator count

#### Attestation

- **`Attestation.Root`** — Context provider for attestation data
- **`Attestation.Timestamp`** — Display attestation timestamp
- **`Attestation.Signature`** — Display attestation signature
- **`Attestation.Validator`** — Display validator address
- **`Attestation.BlockNumber`** — Display attested block number
- **`AttestationList.Root`** — Context provider for attestation list
- **`AttestationList.Item`** — Individual attestation item
- **`AttestationList.Count`** — Display attestation count

#### FinalizationStatus

- **`FinalizationStatus.Root`** — Context provider for finalization data
- **`FinalizationStatus.Progress`** — Display progress bar
- **`FinalizationStatus.Percentage`** — Display percentage complete
- **`FinalizationStatus.Badge`** — Display status badge
- **`FinalizationStatus.AttestationCount`** — Display attestation count
- **`FinalizationStatus.ElapsedTime`** — Display elapsed time

#### RequestDuration

- **`RequestDuration.Root`** — Context provider for request timing
- **`RequestDuration.Value`** — Display total duration
- **`RequestDuration.Breakdown`** — Display timing breakdown

#### AddNetworkButton

- **`AddNetworkButton.Root`** — Context provider for add network action
- **`AddNetworkButton.Trigger`** — Trigger button to add pod network to wallet
- **`AddNetworkButton.Status`** — Display add network status

### Utilities

- **`truncateHash(hash, options)`** — Truncate hash strings
- **`isValidHash(value)`** — Validate hash format
- **`isValidAddress(value)`** — Validate address format
- **`isValidTxHash(value)`** — Validate transaction hash format
- **`copyToClipboard(text)`** — Copy text to clipboard
- **`isClipboardAvailable()`** — Check clipboard API availability
- **`isSSR()`** — Check if running in SSR environment
- **`isWebSocketAvailable()`** — Check WebSocket API availability
- **`browserOnly(fn)`** — Execute function only in browser
- **`formatTokenAmount(value, decimals, options)`** — Format token amounts
- **`parseTokenAmount(value, decimals)`** — Parse token amount strings
- **`formatTimestamp(timestamp, options)`** — Format timestamps
- **`relativeTime(timestamp)`** — Format relative time
- **`formatDuration(milliseconds)`** — Format duration

## Coming from Ethereum?

The `@podnetwork/react` package works similarly to popular Ethereum React
libraries like wagmi and RainbowKit, but is optimized for pod network's unique
features:

| Feature           | Ethereum (wagmi)   | pod SDK                 |
| ----------------- | ------------------ | ----------------------- |
| Provider Setup    | `WagmiConfig`      | `PodProvider`           |
| Wallet Hook       | `useAccount()`     | `useWallet()`           |
| Balance Query     | `useBalance()`     | `useBalance()`          |
| Transaction Query | `useTransaction()` | `useTransaction()`      |
| Real-time Data    | polling            | WebSocket subscriptions |

**What's different**:

- Built-in WebSocket support for orderbook and auction data
- Finalization status tracking (sub-200ms finality)
- Headless components for common blockchain patterns
- No native token — WETH is used for gas

**What's similar**:

- React hooks for blockchain queries
- Wallet connection management
- Type-safe TypeScript API
- SSR compatibility

## Related Packages

| Package                                           | Description                 |
| ------------------------------------------------- | --------------------------- |
| [`@podnetwork/core`](../core)                     | Core client and types       |
| [`@podnetwork/wallet`](../wallet)                 | Wallet management           |
| [`@podnetwork/wallet-browser`](../wallet-browser) | Browser wallet integration  |
| [`@podnetwork/orderbook`](../orderbook)           | CLOB trading                |
| [`@podnetwork/auction`](../auction)               | Batch auction participation |
| [`@podnetwork/ws`](../ws)                         | WebSocket subscriptions     |
| [`@podnetwork/faucet`](../faucet)                 | Testnet faucet              |

## Contributing

We welcome contributions! Please see our
[Contributing Guide](../../CONTRIBUTING.md) for details.

## License

[MIT](./LICENSE) © pod network
