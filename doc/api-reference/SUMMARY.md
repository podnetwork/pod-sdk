# Table of contents

* [Getting Started](README.md)

## Guides

* [Recover a Locked Account](guides/recover-locked-account.md)

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
