# Protocol Overview

Pod uses a Byzantine fault-tolerant protocol that can tolerate up to 1/5 of validators acting adversarially. Unlike traditional blockchains, Pod's core protocol does not totally order transactions. This relaxation is what allows Pod to confirm transactions in a single network round trip, achieving latencies of ~150ms, bounded only by network propagation delay.

Pod does not have blocks or chains. Clients send transactions directly to the validator set. Each validator independently validates, timestamps, and signs the transaction, streaming attestations back to the client. Once attestations from a sufficient quorum are collected, the transaction is final. This entire flow completes in one round trip. See [Transaction Flow](network-architecture/transaction-flow.md) for a detailed walkthrough.

## Why Pod is Fast

Consensus protocols totally order transactions, which requires a leader to propose blocks and multiple rounds of communication between validators to commit them. This coordination is expensive - every additional round adds at least one network hop of latency, and the leader becomes a throughput bottleneck since all transactions must flow through it. Pod avoids this by being coordination-free: validators do not communicate with each other to process a transaction. Instead, application-level invariants - double-spend prevention, balance checks, auction deadlines - are designed so they can be verified independently by each validator without requiring a shared global order. This is possible because Pod's core primitives (payments, token transfers, order submissions) are commutative or deadline-bound, so their correctness does not depend on the order in which validators see them. The result is that confirmation takes a single network round trip, bounded only by propagation delay.

Not every application can be built fully coordination-free. This is a new paradigm, and applications must be carefully designed to exploit it. Pod's enshrined primitives are built this way from the ground up. Applications that require strict global ordering can use [ordering gadgets](https://youtu.be/1aCiPb266Uw?si=AMAfRAOw6Y5WD5PK) - sequencers that transactions pass through before reaching validators. The sequencer is trusted only for liveness, not for equivocation - it can go offline but it cannot reorder or censor without detection.

## Design Principles

**Streaming**  - Pod uses a publish/subscribe model over persistent connections. Validators stream attestations, state updates, and events to clients as they become available, rather than batching them into blocks at fixed intervals.

**Enshrined Market Primitives**  - The protocol includes a built-in [order book](orderbook.md), [batch auction matching engine](batch-auctions.md), liquidation and margin engines, pricing oracles, and a [token](fungible-tokens.md) model. All expose standard Ethereum interfaces.

**MEV-Free**  - Transactions are finalized without going through a centralized entity (e.g. leader or sequencer). All validators receive transactions simultaneously. The matching engine uses batch auctions where orders compete on price alone, independent of submission time or latency. This [eliminates MEV](markets-overview.md#why-pod-has-no-mev) structurally.

## Navigating the Docs

**Network**  - the core consensus and infrastructure layer:
- [Network Architecture](network-architecture/README.md)  - entities in the network and how they interact
  - [Transaction Flow](network-architecture/transaction-flow.md)  - submission, attestation, finality, and recovery
  - [Local Ordering](network-architecture/local-ordering.md)  - per-account ordering, nonces, and the partial order model
  - [Censorship Resistance](network-architecture/censorship-resistance.md)  - how the leaderless design guarantees liveness
- [Native Bridge](native-bridge.md)  - deposit and withdrawal flows between Ethereum and Pod

**Markets**  - the enshrined market primitives:
- [Overview](markets-overview.md)  - enshrined market infrastructure and MEV elimination
- [Orderbook](orderbook.md)  - the enshrined CLOB precompile and order types
- [Matching](batch-auctions.md)  - batch auctions, deadlines, and the solver
- [Tokens](fungible-tokens.md)  - the native token model