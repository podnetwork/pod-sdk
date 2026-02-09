# Table of contents

* [Developer Platform API](README.md)

## API Specification

* [JSON-RPC ](api-specification/json-rpc/README.md)
  * ```yaml
    type: builtin:openapi
    props:
      models: true
      downloadLink: false
    dependencies:
      spec:
        ref:
          kind: openapi
          spec: pod-docs
    ```
* [Applications (Precompiles)](api-specification/applications-precompiles/README.md)
  * [Orderbook Spot](api-specification/applications-precompiles/orderbook-spot.md)
  * [\[WIP\] Optimistic Auctions](api-specification/applications-precompiles/wip-optimistic-auctions.md)
