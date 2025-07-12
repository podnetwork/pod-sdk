---
layout: single
---

# Tokens

### Creating a fungible token

Unlike traditional blockchains where token logic runs over globally ordered blocks, pod allows token contracts to enforce safety (e.g. no overdrafts) even when transactions are confirmed independently and concurrently.

This guide shows how to create and use a simple fungible token using `FastTypes.Balance`, a type provided by `pod-sdk` that integrates directly with pod’s validator quorum logic.


To get started, clone `podnetwork/pod-sdk` github repository and go to `examples/tokens` directory:

```bash clickToCopy
$ git clone github.com/podnetwork/ && cd examples/tokens
```