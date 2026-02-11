# Table of contents

* [API Reference](README.md)
* [Network Config](network-config.md)
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
* [Applications (Precompiles)](applications-precompiles/README.md)
  * [Orderbook Spot](applications-precompiles/orderbook-spot.md)
  * [Optimistic Auctions](applications-precompiles/wip-optimistic-auctions.md)
  * [Bridge](applications-precompiles/page-1.md)
