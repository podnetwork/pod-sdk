# Table of contents

* [Getting Started](README.md)

## Guides

* [Place an order](guides/place-an-order.md)
* [Read market data](guides/read-market-data.md)
* [Bridge to Pod](guides/bridge-to-pod.md)
* [Bridge from Pod](guides/bridge-from-pod.md)
* [Recover a locked account](guides/recover-locked-account.md)
* [Bid in an optimistic auction](guides/optimistic-auction.md)

## References

* [JSON-RPC](json-rpc/README.md)
  * ```yaml
    props:
      models: true
      downloadLink: true
    type: builtin:openapi
    dependencies:
      spec:
        ref:
          kind: openapi
          spec: pod-docs
    ```
* [Precompiles](applications-precompiles/README.md)
  * [Orderbook Spot](applications-precompiles/orderbook-spot.md)
  * [Optimistic Auctions](applications-precompiles/wip-optimistic-auctions.md)
  * [Bridge](applications-precompiles/bridge.md)

## Case Studies

* [CowSwap Solver Auctions](case-studies/cowswap-solver-auctions.md)
* [RollupBoost Priority Auctions](case-studies/rollupboost-priority-auctions.md)
