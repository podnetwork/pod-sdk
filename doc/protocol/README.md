# Protocol Overview

Pod Network is powered by a novel Byzantine fault-tolerant protocol that can tolerate up to 1/5 of validators acting adversarially. Unlike traditional blockchains, Pod's core protocol does not totally order transactions. This relaxation is what allows Pod to confirm transactions in a single network round trip  - achieving latencies of under 200ms, matching the physical limits of the network itself.

Pod does not have blocks or chains. Clients send transactions directly to the validator set. Each validator independently validates, timestamps, and signs the transaction, streaming attestations back to the client. Once attestations from a sufficient quorum are collected, the transaction is final. This entire flow completes in one round trip. See [Transaction Flow](network-architecture/transaction-flow.md) for a detailed walkthrough.

## Design Principles

**Single Round-Trip Finality**  - Validators attest to transactions independently without coordinating with each other. Clients collect attestations from a quorum and the transaction is final. Confirmation latency is bounded by network propagation delay.

**Streaming**  - Pod uses a publish/subscribe model over persistent connections. Validators stream attestations, state updates, and events to clients as they become available, rather than batching them into blocks at fixed intervals.

**Enshrined Market Primitives**  - The protocol includes a built-in [order book](markets-architecture/orderbook.md), [batch auction matching engine](markets-architecture/batch-auctions.md), liquidation and margin engines, pricing oracles, and a [token](fungible-tokens.md) model. All expose standard Ethereum interfaces.

**Leaderless Ordering**  - There is no leader or sequencer. All validators receive transactions simultaneously. The matching engine uses batch auctions where orders compete on price alone, independent of submission time or latency. This [eliminates MEV](markets-architecture/README.md#why-pod-has-no-mev) structurally.

## Navigating the Docs

**Network**  - the core consensus and infrastructure layer:
- [Network Architecture](network-architecture/README.md)  - entities in the network and how they interact
  - [Transaction Flow](network-architecture/transaction-flow.md)  - submission, attestation, finality, and recovery
  - [Local Ordering](network-architecture/local-ordering.md)  - per-account ordering, nonces, and the partial order model
  - [Censorship Resistance](network-architecture/censorship-resistance.md)  - how the leaderless design guarantees liveness
- [Native Bridge](native-bridge.md)  - deposit and withdrawal flows between Ethereum and Pod

**Markets**  - the enshrined market primitives:
- [Overview](markets-architecture/README.md)  - purpose-built market infrastructure and MEV elimination
- [Orderbook](markets-architecture/orderbook.md)  - the enshrined CLOB precompile and order types
- [Matching](markets-architecture/batch-auctions.md)  - batch auctions, deadlines, and the solver
- [Tokens](fungible-tokens.md)  - the native token model