# Protocol Overview

Pod Network is powered by a novel Byzantine fault-tolerant protocol that can tolerate up to 1/5 of validators acting adversarially. Unlike traditional blockchains, Pod's core protocol does not totally order transactions. This relaxation is what allows Pod to confirm transactions in a single network round trip — achieving latencies of under 200ms, matching the physical limits of the network itself.

Pod does not have blocks or chains. Clients send transactions directly to the validator set. Each validator independently validates, timestamps, and signs the transaction, streaming attestations back to the client. Once attestations from a sufficient quorum are collected, the transaction is final. This entire flow completes in one round trip. See [Transaction Flow](network-architecture/transaction-flow.md) for a detailed walkthrough.

## Design Principles

**Optimal Latency** — No multi-round consensus. Transactions confirm in one network round trip because validators don't need to coordinate with each other before attesting. Confirmation time is bounded only by actual network delay.

**Streaming** — Pod uses a publish/subscribe model over persistent connections. Validators stream attestations, state updates, and events to clients as soon as they are available — no polling, no block intervals.

**Built for Markets** — Pod enshrines a set of optimized market primitives directly into the protocol: a high-performance [order book](markets-architecture/orderbook.md), a [batch auction matching engine](markets-architecture/batch-auctions.md), liquidation and margin engines, native pricing oracles, and a [fungible token](fungible-tokens.md) model. All expose standard Ethereum interfaces.

**Fairness by Design** — Pod has no leader and no sequencer. All validators receive transactions simultaneously. The matching engine uses batch auctions where orders compete on price alone — independent of submission time, latency, or geography. This [eliminates MEV](markets-architecture/no-mev.md) structurally.

## Navigating the Docs

**Network** — the core consensus and infrastructure layer:
- [Network Architecture](network-architecture/README.md) — entities in the network and how they interact
  - [Transaction Flow](network-architecture/transaction-flow.md) — submission, attestation, finality, and recovery
  - [Local Ordering](network-architecture/local-ordering.md) — per-account ordering, nonces, and the partial order model
  - [Censorship Resistance](network-architecture/censorship-resistance.md) — how the leaderless design guarantees liveness
- [Native Bridge](native-bridge.md) — deposit and withdrawal flows between Ethereum and Pod

**Applications** — the enshrined market primitives:
- [Markets Architecture](markets-architecture/README.md) — order book, matching, and settlement
  - [Orderbook](markets-architecture/orderbook.md) — the CLOB precompile and order lifecycle
  - [Batch Auctions](markets-architecture/batch-auctions.md) — how orders are matched fairly
  - [Why Pod Has No MEV](markets-architecture/no-mev.md) — structural MEV elimination
- [Fungible Tokens](fungible-tokens.md) — the native token model
