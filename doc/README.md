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
  metadata:
    visible: true
  tags:
    visible: true
metaLinks:
  alternates:
    - https://app.gitbook.com/s/2AwfWOGBWBxQmyvHedqW/
---

# Welcome to Pod

Pod Network is a purpose-built network for high-performance, MEV-free markets. It has no blocks or chains - transactions are streamed to a geo-distributed validator set, which independently validates them and streams attestations back. Once a quorum of attestations is collected, the transaction is final. Confirmation takes a single network round trip (~150ms) and the network can sustain 300k+ transactions per second.

Trades are matched via frequent batch auctions at a uniform clearing price, which structurally prevents MEV. The protocol exposes a set of asset-agnostic, composable primitives - including the order book, matching engine, liquidation engine, and oracle system. Pod provides an Ethereum-compatible interface - developers use standard JSON-RPC, wallets, and EVM tooling out of the box.

<table data-view="cards"><thead><tr><th></th><th></th><th data-hidden data-card-target data-type="content-ref"></th></tr></thead><tbody><tr><td><strong>Network Architecture</strong></td><td>Learn how Pod's streaming, consensus-less protocol works under the hood.</td><td><a href="https://docs.v2.pod.network/documentation">Protocol Overview</a></td></tr><tr><td><strong>Markets</strong></td><td>Enshrined orderbook, batch auction matching, and MEV elimination.</td><td><a href="https://docs.v2.pod.network/documentation/markets/markets-overview">Markets Overview</a></td></tr><tr><td><strong>Getting Started</strong></td><td>Devnet config, JSON-RPC endpoints, precompiles, and developer guides.</td><td><a href="api-reference/">api-reference</a></td></tr></tbody></table>
