# Multisig

The Multisig precompile creates multisig accounts. A multisig is an account that acts only when enough of its members sign. Each member is an ordinary account with its own key. The threshold is the number of member signatures that a call needs.

A multisig has its own address, balances, positions and orders. No single key can move its funds. You can replace members, and the address stays the same. A multisig works like a Safe contract that a factory deploys.

{% hint style="info" %}
Multisig precompile address: `0x50d0000000000000000000000000000000000004`
{% endhint %}

The members sign a call off-chain with `eth_signTypedData_v4` and send the signatures to each other. Then any account sends one `execute` transaction with the signatures. Pod has no on-chain approval transaction and no store of pending approvals. For a procedure with examples, see [Use a multisig](../guides/use-a-multisig.md).

## Functions

| Function | Sent to | Sender |
| --- | --- | --- |
| `create(address[] members, uint16 threshold, bytes32 salt)` | the precompile | any account |
| `execute(address multisig, Call call, bytes[] signatures)` | the precompile | any account that has enough member signatures |
| `setConfig(address[] members, uint16 threshold)` | the address of the multisig | only the multisig, as an inner call of a call that it runs |

`create` and `setConfig` follow the same rules:

* `members` is in strictly ascending order: sorted by address, with no duplicates.
* `members` has 16 addresses or fewer.
* `threshold` is 1 or more, and not more than the number of members.

Pod rejects a transaction that does not follow these rules. The transaction does not land.

## Address

The address of a multisig is a CREATE2 address. The deployer is the precompile:

```text
address = CREATE2(deployer      = 0x50d0000000000000000000000000000000000004,
                  salt,
                  initCodeHash  = keccak256(abi.encode(members, threshold)))
```

* You can calculate the address before the multisig exists, with a standard CREATE2 function (`ethers.getCreate2Address`, or `Address::create2` in alloy). Thus you can give the address to depositors in advance.
* The address depends on the initial members, the threshold and the salt. It does not depend on the sender of `create`. Any account can create the multisig. An account that sends `create` first can only create the same multisig.
* If the address already holds a multisig, `create` fails with `address_taken`. The existing multisig does not change.
* `setConfig` does not change the address.
* No private key exists for the address. The address can receive funds like any other address, but it can act only through `execute`.

## Funding

The balances of a multisig are the balances of its address. You fund it like any other account. You can make a bridge deposit to the multisig (see [Bridge to Pod](../guides/bridge-to-pod.md)). You can also send an orderbook `transfer` from another account (see [Transfers between accounts](orderbook.md#transfers-between-accounts)). You can send funds before you create the multisig.

## The signed call

A call is the message that the members sign. It holds a nonce, an expiry time, and a list of inner calls. An inner call is one call that the multisig makes, for example an order or a withdrawal.

```solidity
struct InnerCall { address target; bytes data; }
struct Call      { uint64 nonce; uint64 validUntil; InnerCall[] calls; }
```

The members sign the `Call` as EIP-712 typed data with this domain:

| Domain field | Value |
| --- | --- |
| `name` | `"pod multisig"` |
| `version` | `"1"` |
| `chainId` | the chain id of the network (`eth_chainId`) |
| `verifyingContract` | the address of the multisig, not the address of the precompile |

The domain binds a signature to one multisig on one chain. A signature for a different multisig or chain recovers to an address that is not a member.

This is the `eth_signTypedData_v4` payload for a call with one inner call:

```json
{
  "types": {
    "EIP712Domain": [
      { "name": "name", "type": "string" },
      { "name": "version", "type": "string" },
      { "name": "chainId", "type": "uint256" },
      { "name": "verifyingContract", "type": "address" }
    ],
    "Call": [
      { "name": "nonce", "type": "uint64" },
      { "name": "validUntil", "type": "uint64" },
      { "name": "calls", "type": "InnerCall[]" }
    ],
    "InnerCall": [
      { "name": "target", "type": "address" },
      { "name": "data", "type": "bytes" }
    ]
  },
  "primaryType": "Call",
  "domain": {
    "name": "pod multisig",
    "version": "1",
    "chainId": 1293,
    "verifyingContract": "0x<multisig address>"
  },
  "message": {
    "nonce": 0,
    "validUntil": 1794918600000000,
    "calls": [
      { "target": "0x50d0000000000000000000000000000000000001", "data": "0x<abi-encoded call>" }
    ]
  }
}
```

| Field | Meaning |
| --- | --- |
| `nonce` | The next call nonce of the multisig (see [Nonces](#nonces)). |
| `validUntil` | The last batch that can run the call, in microseconds. It must not be more than 7 days after the batch that runs the call. Only `validUntil` limits when the inner calls run. Their own `deadline` fields do not, so set them to `validUntil`. |
| `calls` | The inner calls. The multisig runs them in order. Each inner call is a `target` address and ABI-encoded calldata. The `data` of all inner calls together must not be more than 4 KiB. |

A signature is 65 bytes: `r || s || v`, with `v` equal to 27 or 28. `eth_signTypedData_v4` returns signatures in this format. Send one signature for each signer, in any order. A call needs `threshold` signatures or more, up to 16. Each signature must recover to a different current member. If one signature comes from a non-member, or two come from the same member, Pod refuses the full call.

A signature counts only if its signer is a member when the call runs. When a `setConfig` removes a member, the signatures of that member stop counting. This includes signatures that the member made before the change.

## Nonces

Each multisig has its own call nonce. The nonce starts at 0. You can read it from [`GET /v1/multisig/{address}`](#reading-a-multisig). A call runs only if `Call.nonce` is equal to the nonce of the multisig. Each call that runs increases the nonce by one.

* If `Call.nonce` is lower, Pod refuses the call as `stale_nonce`. An earlier call used that nonce.
* If `Call.nonce` is higher, Pod refuses the call as `premature`. Pod does not keep the call for later. After the earlier calls run, you can send the same call with the same signatures again.
* Calls run only in nonce order. Thus a call that does not run blocks the calls after it. The block stops when that call runs, expires or is cancelled.

There is no cancel function. To cancel a signed call that nobody sent, run a different call with the same nonce. Usually this call has an empty `calls` list. It only uses the nonce. After it runs, Pod refuses all other calls with that nonce as `stale_nonce`.

When Pod refuses a call, the nonce of the multisig does not change and no inner call runs. The `execute` transaction also has its own transaction nonce. That nonce belongs to the sender account, and the transaction uses it in both cases.

## Inner calls

| Target | Calls | Result |
| --- | --- | --- |
| Orderbook `0x50d0…0002` | `submitOrder` (both forms), `cancel`, `update`, `submitTrigger`, `cancelTrigger`, `updateTrigger`, `setMaxLeverage`, `transfer`, and `submitBatch` of these | intents of the multisig, in the batch that runs the call |
| Orderbook `0x50d0…0002` | `createMarket`, `createMarketV2`, `disableMarket`, `settleMarket`, `updateMarketOracle`, `transferMarket` | market actions that the multisig signs (see [Market admin](#market-admin)) |
| Bridge `0x50d0…0001` | `withdraw`, one per call or fewer | a withdrawal from the balance of the multisig (see [Withdrawals](#withdrawals)) |
| The address of the multisig | `setConfig`, one per call or fewer | a change of members and threshold |

All other targets and calls make the full transaction incorrect. Examples are `delegated`, a call to the multisig precompile, and a call to an unknown address. Pod rejects such a transaction, and it does not land.

An inner call follows the rules for the same call from an ordinary account. The multisig is the signer and the owner. Pod reports the result through the same outcomes as for an ordinary account (`pod_orders`, `pod_transfers`, `pod_withdrawals`, `pod_activity`).

If Pod rejects one inner call, the other inner calls of the call still run. The call also still uses the nonce of the multisig.

### Orders

The multisig owns the orders that its inner calls place. The order id uses the same formula as for all other orders:

```text
order_id = keccak256(abi.encode(address multisig, uint64 callNonce, uint32 sequence))
```

`callNonce` is the nonce of the call. `sequence` is the position of the intent among the orderbook inner calls of the call. Market actions count. Each intent in an inner `submitBatch` counts as one position. The `tx_hash` of the order is the hash of the `execute` transaction. The id of an inner `transfer` uses the same formula.

The multisig can `cancel` and `update` the orders that it owns, as an ordinary owner can.

### Member changes

`setConfig` replaces the members and the threshold. It follows the rules of `create`. The change applies when its call runs. The next call needs signatures from the new members.

### Withdrawals

An inner `Bridge.withdraw` sends funds from the balance of the multisig to an address on the bridged chain. It follows the rules in the [Bridge precompile reference](bridge.md#withdrawing).

The withdrawal id is the hash of the `execute` transaction. You use this hash with `GET /v1/bridge/withdrawals/by-id/{tx_hash}`, with `pod_getBridgeClaimProof`, and for the claim on the bridged chain. For this reason, a call can have one withdrawal or none. If Pod refuses the full call, no withdrawal exists, and a lookup by its hash returns not found.

### Market admin

The network keeps an allowlist of market admins. A multisig address can be on this allowlist. A market admin must be on the allowlist to send any market call, and a multisig is no exception.

A multisig on the allowlist creates markets with an inner `createMarket` or `createMarketV2`, and owns them. It manages them with inner `disableMarket`, `settleMarket`, `updateMarketOracle` and `transferMarket` calls. Another owner can give a market to the multisig with `transferMarket`. `transferMarket` requires that the new owner is on the allowlist. See [Market lifecycle](orderbook.md#market-lifecycle).

## Outcomes

| Transaction | Receipt |
| --- | --- |
| `create` | success, or failed if the address already holds a multisig |
| `execute`, call authorized | success, also if Pod rejects some or all inner calls |
| `execute`, call refused | failed |

The receipt of an `execute` shows only whether the call was authorized and ran. It does not show the result of each inner call. Inner calls do not have their own receipts. To follow them, read the outcomes and the activity of the multisig.

To find why a receipt failed, read the activity of the sender account. The activity is in the [`pod_activity`](../json-rpc/README.md) stream and in `GET /v1/clob/activity/{account}`. A `multisig_created` or `multisig_call` entry has an `err` field:

| `err` | Meaning |
| --- | --- |
| `address_taken` | `create`: the address already holds a multisig. |
| `no_multisig` | No multisig exists at the address. |
| `stale_nonce` | `Call.nonce` is lower than the nonce of the multisig. |
| `premature` | `Call.nonce` is higher than the nonce of the multisig. Send the call again after the earlier calls run. |
| `expired` | `validUntil` is before the batch that runs the call. |
| `too_far_ahead` | `validUntil` is more than 7 days after the batch that runs the call. |
| `below_threshold` | The call has fewer signatures than the threshold. |
| `invalid_signature` | A signature does not recover to an address. For example, `v` is 0 or 1, not 27 or 28. |
| `non_member` | A signature recovers to an address that is not a member. |
| `duplicate_signer` | Two signatures recover to the same member. |
| `unsupported_inner_call` | Pod does not support an inner call. |

The sender sees all of its entries, refused ones included. The activity of the multisig shows a `create` only if it succeeded, and a call only if it ran. Thus other accounts cannot add entries to it with refused calls.

If a call ran a `setConfig`, its entry has the new `members` and `threshold`. Inner calls show in the activity of the multisig as the usual entries for intents: `order`, `transfer`, `bridge_transfer`, and the other kinds.

## Reading a multisig

Each node serves `GET /v1/multisig/{address}`. It returns the current configuration:

```json
{
  "members": ["0x4e5a…", "0xccb8…", "0xf7f2…"],
  "threshold": 2,
  "nonce": 3,
  "timestamp": 1794914886000000
}
```

* `nonce` is the nonce for the next call.
* `timestamp` is the last batch that the node ran, in microseconds.
* If the address holds no multisig, the node returns `404` with `{"timestamp": …}`.

You can add `?timestamp=<µs>`. The node then waits until it has run that batch, for example the batch of a receipt that you received. The value is a lower limit. It does not read an earlier state. If the node does not get to that batch during its wait time, it returns `503`.

## Limits

| Limit | Value |
| --- | --- |
| Members, and signatures for each call | 16 |
| `data` of all inner calls in one call | 4 KiB |
| `validUntil` after the batch that runs the call | 7 days |
| `setConfig` calls in one call | 1 |
| `Bridge.withdraw` calls in one call | 1 |

Pod rejects a transaction above the first two limits, and the transaction does not land. Pod applies the `validUntil` limit when the call runs, and refuses the call as `too_far_ahead`.

## Interface

```solidity
interface IPodMultisig {
    struct InnerCall {
        address target;
        bytes data;
    }

    /// @notice What the members sign, under the EIP-712 domain
    ///         {name: "pod multisig", version: "1", chainId, verifyingContract: multisig}.
    struct Call {
        uint64 nonce;
        uint64 validUntil;
        InnerCall[] calls;
    }

    /// @notice Open a multisig at the CREATE2 address with deployer 0x50d0…0004, `salt`
    ///         and init code hash keccak256(abi.encode(members, threshold)).
    /// @dev Anyone may send it. `members` strictly ascending, at most 16;
    ///      1 <= threshold <= members.length. Fails when the address already holds a multisig.
    function create(address[] calldata members, uint16 threshold, bytes32 salt) external;

    /// @notice Run `call` as `multisig`.
    /// @dev `signatures` are 65-byte r||s||v (v = 27 or 28) over the Call's EIP-712 hash,
    ///      one per signer, in any order. A Call with no inner calls only consumes its
    ///      nonce, which cancels any other call signed for that nonce.
    function execute(address multisig, Call calldata call, bytes[] calldata signatures) external;
}

/// @notice Called on the multisig's own address, as an inner call of `execute`.
interface IPodMultisigAccount {
    /// @notice Replace the members and threshold, under the rules of `create`.
    ///         The address and the call nonce stay.
    function setConfig(address[] calldata members, uint16 threshold) external;
}
```
