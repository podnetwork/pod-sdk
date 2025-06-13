---
title: Coming from Ethereum?
layout: single

url: /overview

toc:
  execution-model: Execution Model
  solidity-and-evm: Solidity and EVM
  json-rpc: JSON-RPC
  foundry-and-alloy: Foundry and Alloy
---

# Coming from Ethereum?

Those familiar with the Ethereum ecosystem will recognize the EVM environment and similar RPC interface, but pod rethinks core assumptions around execution and ordering.

! anchor execution-model
## Execution Model

pod does **not have a globally ordered chain of blocks**, and therefore does not maintain a single, globally agreed-upon state mapping. Each validator executes transactions according to its local view, which may differ in order or timing from other nodes.

However, for **order-independent applications**—where the outcome is unaffected by the relative ordering of unrelated transactions—the resulting state across honest validators will converge in all **observable outputs** once they have seen the same set of transactions. This includes things like logs emitted, token balances, and receipt contents.

Even if internal storage layouts or execution traces differ, these applications will see consistent results from their point of view. In contrast, applications that rely on strict ordering must sequence transactions before sending them to pod.

! anchor solidity-and-evm
## Solidity and EVM

pod supports EVM (specifically the **Berlin** version), but with important caveats:

1. Only **legacy transactions** are supported:
   - No support for EIP-1559: **no base fee**, **no priority fee**, **no access lists**, **no blob transactions**.
2. **Block context fields are mostly zeroed out**:
   - `block.timestamp` is the **local validator's time**, not a globally agreed timestamp.
   - `block.number`, `block.coinbase`, `block.difficulty`, and `block.basefee` are **all set to 0**.
3. Smart contracts must be written to tolerate the absence of global context and ordering.
   - Any time-sensitive logic must treat timestamps as advisory and potentially inconsistent.

! anchor json-rpc
## JSON-RPC

pod supports most of the Ethereum JSON-RPC interface, but with critical deviations:

- **All standard Ethereum RPCs are supported**, however
- **Block-related queries** like `eth_getBlockByNumber` or `eth_getBlockByHash` respond with **empty block data** and should not be used in application logic.

### Special Metadata Field: `pod_metadata`

All RPC responses include a special JSON field called `pod_metadata`. This field contains pod-specific metadata useful for validation and auditing.

For **transaction receipts**, `pod_metadata` includes:

- A list of **attestations** (signatures from validators).
- If the number of attestations is greater than **two-thirds of the current validator set**, the receipt is considered **confirmed**.
- This replaces traditional "confirmation count" logic in block-based chains.

Applications should use these attestations to verify transaction finality instead of relying on block numbers or confirmation depths.

### pod-specific extensions:

- `pod_getCommittee`: Returns the current validator set.
- `pod_listAccountReceipts`: Returns receipts involving a given account as sender or receiver.
- `pod_listConfirmedReceipts`: Returns receipts confirmed between two timestamps, *as observed by the connected full node*. Since time is not globally agreed, this is a local view.

! anchor foundry-and-alloy
## Foundry and Alloy

You can continue to use **Foundry** and **Alloy** with pod. Transactions must be sent as legacy transactions.

We recommend the use of [PodProviderBuilder](https://docs.rs/pod-sdk/latest/pod_sdk/provider/struct.PodProviderBuilder.html) and [PodTransactionRequest](https://docs.rs/pod-sdk/latest/pod_sdk/network/struct.PodTransactionRequest.html) provided by [pod-sdk](https://docs.rs/pod-sdk).

See the [Examples](/examples) section for more detailed examples.
