---
title: Architecture
layout: single

url: /architecture/coordination-free
---

# What makes pod fast?

pod is faster and more efficient than any other L1 or blockchain system out there, because pod is **coordination-free** and therefore does not pay the price of coordination and globally ordering transactions.

## Coordination-free

In distributed systems, **coordination** refers to the act of synchronizing across nodes to ensure a shared understanding of global state or to make decisions (e.g., ordering, mutual exclusion, locking). Coordination is expensive: it introduces latency, reduces throughput, and makes systems more fragile under partial failure or network partitions.

A **coordination-free** system avoids these costs by designing its logic such that correctness doesn’t depend on agreement or synchronization across nodes. Operations can proceed independently and concurrently, without waiting for others.

At pod, **coordination-freedom** is a first-class design principle. It’s how we achieve fast settlement (within one network round trip), high scalability, and robustness under network delay and censorship.

---

## Why Coordination is Expensive

Coordination fundamentally requires communication between multiple nodes, with multiple round-trips latency at best. For example:

- Consensus protocols (like PBFT, Tendermint) require multiple rounds of messaging.
- Centralized orderbooks require lockstep access to shared state.
- Traditional transaction serializability relies on locking or global timestamps.

This limits throughput, increases tail latency, and creates choke points — all of which are unacceptable for global, real-time markets and payments.

---

## Coordination-Free in pod

pod network is built on the idea that **most application-level invariants can be preserved without coordination**, if we restructure how validation and visibility work.

**Examples in pod**:

- [Payments](/examples/tokens): Double-spending is prevented without consensus by requiring validators to sign off on unique transaction nonces and verifying the client has enough balance. Clients gather a threshold of signatures asynchronously.
- [Auctions](/examples/auctions): The order in which bids are sent to an auction does not matter, as long as the bid was sent before deadline.
- [Voting](/examples/voting): Similarly, the order in which votes are submitted does not matter.

## What Can Be Coordination-free?

In practice, many requirements can be **relaxed or reframed** into coordination-free patterns using:

- **CRDTs** (Conflict-Free Replicated Data Types)
- **Commutative operations**

In general, *monotonic* programs are coordination-free: If a smart contract produces some output (eg some event log), the output must never be reverted irrespective of all future transactions.

You can use our [Solidity SDK](/solidity-sdk) to help you write coordination-free smart contracts on pod.

---

## What Can’t Be Coordination-Free?

Not everything can be done without coordination. If the order in which transactions are executed changes the result of the execution, then the application needs global order.

While pod does not natively provide global order, all transactions for this application can be sent to a sequencer (or a committee of sequencers) and then broadcasted to pod.

---

## Learn more

Learn from examples such as [ERC20 tokens](/examples/tokens) and [NFTs](/examples/nfts).
