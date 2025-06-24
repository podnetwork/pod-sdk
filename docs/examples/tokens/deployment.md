---
layout: single
---

## Deployment

When deploying the smart contract, don't forget to set the evm version to `berlin`.

```bash
$ forge create --rpc-url https://rpc.v1.dev.pod.network \
    --private-key $PRIVATE_KEY \
    --evm-version berlin \
    src/Token.sol:Token \
    --constructor-args "token" "TKC" 9 1000000000000
```