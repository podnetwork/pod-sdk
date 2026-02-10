---
description: The network for high-performance, MEV-free, global markets
layout:
  width: wide
  title:
    visible: true
  description:
    visible: true
  tableOfContents:
    visible: false
  outline:
    visible: false
  pagination:
    visible: false
---

# Welcome to Pod

Pod Network is the network for high-performance, MEV-free, global markets. Pod's consensus-less, streaming architecture confirms transactions in under 200ms and supports 300k+ transactions per second. Trades are matched via fast batch auctions, eliminating MEV by design.

Pod does not have blocks or chains. Transactions are streamed to a geo-distributed validator set, which locally validates them and streams attestations back. Once a quorum of attestations is reached, the transaction is final. The network is Byzantine fault-tolerant, secured by validator stakes, and permissionless by design.

At the protocol core, Pod exposes a set of asset-agnostic, composable primitives — including the order book, matching engine, liquidation, and oracle systems — enabling developers to launch novel markets quickly. Developers interact with Pod using Ethereum-style JSON-RPC, wallets, and EVM tooling.

## Quick Links

<table data-view="cards"><thead><tr><th></th><th></th><th data-hidden data-card-target data-type="content-ref"></th></tr></thead><tbody><tr><td><strong>Network Architecture</strong></td><td>Learn how Pod's streaming, consensus-less protocol works under the hood.</td><td><a href="protocol/network-architecture/README.md">network-architecture</a></td></tr><tr><td><strong>API Reference</strong></td><td>JSON-RPC endpoints, request formats, and Pod-specific extensions.</td><td><a href="api-reference/README.md">api-reference</a></td></tr><tr><td><strong>Network Config</strong></td><td>Chain ID, RPC URLs, faucet, and explorer for the live devnet.</td><td><a href="network-config.md">network-config.md</a></td></tr></tbody></table>
