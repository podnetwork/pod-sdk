---
title: Welcome to pod
layout: single

url: /

toc:
  welcome-to-pod: Welcome to pod
  what-makes-pod-different: What Makes pod Different?
  key-features: Key Features
---

! gridstack

! grid

## Welcome

Lorem ipsum dolor sit amet consectetur. Turpis libero morbi eget varius etiam.

! grid end

! grid

## Welcome

Lorem ipsum dolor sit amet consectetur. Turpis libero morbi eget varius etiam.


! grid end

! grid

## Welcome

Lorem ipsum dolor sit amet consectetur. Turpis libero morbi eget varius etiam.


! grid end

! gridstack end

! anchor welcome-to-pod

# Welcome to pod

pod is a novel programmable distributed ledger that prioritizes performance and efficiency by implementing a unique approach to transaction processing and consensus. Instead of enforcing strict transaction ordering like traditional blockchains, pod allows transactions to have temporal flexibility while maintaining byzantine resilience.

! anchor what-makes-pod-different

## What Makes pod Different?

pod achieves exceptional performance through:

- **Fast finality**: Transactions confirmed in 200ms.
- **Short-term censorship resistance**: Leaderless, blockless design that doesn't allow a transaction to be censored even for a small duration.
- **Light client support**: All receipts and logs include aggregate signature from pod's committee, allowing for trustless design and verification of pod transacitons on other chains.

! anchor key-features

## Key Features

### Fast Path Execution

pod leverages "fast path" for compatible operations that don't require strict ordering, such as payments and certain types of smart contracts. This allows for significantly faster transaction processing compared to traditional blockchain systems.

> Learn more about pod's fast path execution in our technical deep dive on [Partial Order](/architecture/fast-path) and our [Execution Model](/architecture/execution-model) documentation pages.

## Get Started

New to pod? Read our [Getting Started](/getting-started) page to configure your wallet and obtain test tokens.

### Network overview

The system consists of several key components:

- [Validators](/architecture/network#validators): Process transactions independently without direct communication between them
- [Nodes](/architecture/network#nodes): Connect to validators, maintain state and provide RPC servers for clients.
- [Clients](/architecture/network#clients): Applications interacting with pod network.

### Common Use Cases

pod is particularly well-suited for:

- [Transfers](/how-to-guides/transfers): Account-to-account transfers with optimal latency
- [Fast Auctions](/how-to-guides/auctions): Efficient auction execution with accountability, e.g. fast batch auctions, orderbooks, marketplaces.
- [Feeds](/how-to-guides/feed-layer): High-performance content feeds e.g. for decentralised socials

### Developer Resources

- [Solidity SDK Reference](/reference/solidity-sdk)
- [SDK Reference](/reference/sdk)
- Set up a [local devnet](/getting-started) for deeper exploration

> Pod is still at an early stage. With our first release we are inviting developers to try out pod for their use cases. Expect instability and lots of changes.
