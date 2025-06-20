---
layout: single
---

! anchor general-rpc-api

# RPC API

This documentation provides detailed information about the JSON-RPC methods supported by pod.

## Overview

! anchor overview

Pod implements a JSON-RPC API that allows interaction with the network. While many methods align with the Ethereum JSON-RPC specification (methods prefixed with `eth_`), pod includes additional metadata (`pod_metadata` attribute) and pod-specific functionality (methods prefixed with `pod_`).

---

! anchor base-url

## Base URL

The API endpoint is accessible at `https://rpc.v2.pod.network`.

! codeblock title="API endpoint"

```bash
https://rpc.v2.pod.network
```

! codeblock end
