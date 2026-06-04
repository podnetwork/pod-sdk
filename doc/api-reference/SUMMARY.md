# Table of contents

* [Getting Started](README.md)

## Guides

* [Place a spot order](guides/place-a-spot-order.md)
* [Place a perpetual order](guides/place-a-perpetual-order.md)
* [Read market data](guides/read-market-data.md)
* [Bridge to Pod](guides/bridge-to-pod.md)
* [Bridge from Pod](guides/bridge-from-pod.md)
* [Recover a locked account](guides/recover-locked-account.md)
* [Bid in an optimistic auction](guides/optimistic-auction.md)

## References

* [Market Configurations](market-configurations.md)
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
* [JSON-RPC Errors](json-rpc-errors.md)
* [Precompiles](applications-precompiles/README.md)
  * [Orderbook](applications-precompiles/orderbook.md)
  * [Optimistic Auctions](applications-precompiles/wip-optimistic-auctions.md)
  * [Bridge](applications-precompiles/bridge.md)
  * [Recovery](applications-precompiles/recovery.md)

## Case Studies

* [CowSwap Solver Auctions](case-studies/cowswap-solver-auctions.md)
* [RollupBoost Priority Auctions](case-studies/rollupboost-priority-auctions.md)
