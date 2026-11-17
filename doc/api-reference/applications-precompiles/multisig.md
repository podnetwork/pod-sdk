# Multisig

The **Multisig precompile** creates accounts that act only with the signatures of several keys. A multisig behaves like a Safe deployed by a factory: it has its own address, its own balances, positions and orders, and it acts only when enough of its members sign a call. No single key can move its funds, and members can be replaced without changing the address.

{% hint style="info" %}
**Multisig precompile address:** `0x50d0000000000000000000000000000000000004`
{% endhint %}

Members sign a call off-chain with `eth_signTypedData_v4` and pass the signatures to each other; any account then sends one `execute` transaction carrying them. There is no on-chain approval transaction and no store of pending approvals. For a step-by-step walkthrough, see [Use a multisig](../guides/use-a-multisig.md).

## Functions

| Function | Sent to | Sender |
| --- | --- | --- |
| `create(address[] members, uint16 threshold, bytes32 salt)` | the precompile | anyone |
| `execute(address multisig, Call call, bytes[] signatures)` | the precompile | anyone holding enough member signatures |
| `setConfig(address[] members, uint16 threshold)` | the multisig's own address | only the multisig, as an inner call of a call it executes |

`create` and `setConfig` follow the same rules: `members` strictly ascending (sorted by address, no duplicates), at most 16 of them, and `1 ≤ threshold ≤ members.length`. A transaction that breaks them is rejected and never lands.

## Address

A multisig's address is a CREATE2 address with the precompile as deployer:

```text
address = CREATE2(deployer      = 0x50d0000000000000000000000000000000000004,
                  salt,
                  initCodeHash  = keccak256(abi.encode(members, threshold)))
```

* Stock CREATE2 helpers (`ethers.getCreate2Address`, alloy's `Address::create2`) compute it before the multisig exists, so the address can be shared as a deposit address in advance.
* It depends on the initial members, threshold and salt, not on who sends `create`. Anyone may create it; a front-runner can only create the same multisig.
* A `create` for an address that already holds a multisig fails with `address_taken` and leaves the existing one unchanged.
* `setConfig` does not change the address.
* No private key exists for the address. It can receive funds like any other address, but it can only act through `execute`.

## Funding

The multisig's balances are the balances of its address. Fund it like any other account: a bridge deposit with the multisig as recipient (see [Bridge to Pod](../guides/bridge-to-pod.md)), or an orderbook `transfer` from another account (see [Transfers between accounts](orderbook.md#transfers-between-accounts)). Funds can be sent before the multisig is created.

## The signed call

```solidity
struct InnerCall { address target; bytes data; }
struct Call      { uint64 nonce; uint64 validUntil; InnerCall[] calls; }
```

Members sign the `Call` as EIP-712 typed data under this domain:

| Domain field | Value |
| --- | --- |
| `name` | `"pod multisig"` |
| `version` | `"1"` |
| `chainId` | the network's chain id (`eth_chainId`) |
| `verifyingContract` | the **multisig's** address, not the precompile's |

The domain binds a signature to one multisig on one chain: a signature made for another multisig or chain recovers to an address that is not a member.

The `eth_signTypedData_v4` payload for a call with one inner call:

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
| `nonce` | The multisig's next call nonce (see [Nonces](#nonces)). |
| `validUntil` | The last batch the call may run in, in **microseconds**. It must not lie more than 7 days past the batch that runs the call. It is the only bound on when the inner calls run: their own `deadline` fields do not bound it, so set them to `validUntil`. |
| `calls` | The inner calls, run in order as the multisig. Each is a `target` address and ABI-encoded calldata. Their `data` may total at most 4 KiB. |

**Signatures** are 65 bytes, `r || s || v` with `v` = 27 or 28, as `eth_signTypedData_v4` returns them. Pass one per signer, in any order. A call needs at least `threshold` of them and may carry more, up to 16, but every one must recover to a distinct current member: a single non-member or repeated signer refuses the whole call.

A signature counts only while its signer is a member when the call runs. Once a `setConfig` removes a member, that member's signatures stop counting, including signatures made earlier.

## Nonces

Each multisig has its own call nonce, starting at 0 and read from [`GET /v1/multisig/{address}`](#reading-a-multisig). A call runs only when `Call.nonce` equals it, and every call that runs raises it by one:

* A lower nonce is refused as `stale_nonce`: an earlier call already used it.
* A higher nonce is refused as `premature`. It is not queued. The same call with the same signatures can be sent again once the calls before it have run.
* Calls run strictly in nonce order, so a stuck call blocks the ones after it until it runs, expires or is cancelled.

**Cancelling.** There is no cancel function. To cancel a call that members have signed but nobody has executed, execute a different call at the same nonce, usually one with an empty `calls` list. It only consumes the nonce, and every other call signed for that nonce becomes `stale_nonce`.

A refused call keeps the multisig's nonce and runs none of its inner calls. The `execute` transaction's own nonce belongs to the account that sends it and is consumed either way.

## Inner calls

| Target | Calls | Runs as |
| --- | --- | --- |
| Orderbook `0x50d0…0002` | `submitOrder` (both forms), `cancel`, `update`, `submitTrigger`, `cancelTrigger`, `updateTrigger`, `setMaxLeverage`, `transfer`, and `submitBatch` of these | the multisig's own intents, in the batch the call runs in |
| Orderbook `0x50d0…0002` | `createMarket`, `createMarketV2`, `disableMarket`, `settleMarket`, `updateMarketOracle`, `transferMarket` | market actions signed by the multisig (see [Market admin](#market-admin)) |
| Bridge `0x50d0…0001` | `withdraw`, at most one per call | a withdrawal from the multisig's balance (see [Withdrawals](#withdrawals)) |
| The multisig's own address | `setConfig`, at most one per call | a change of members and threshold |

Any other target or call, such as `delegated`, the multisig precompile itself or an unknown address, makes the whole transaction invalid; it is rejected and never lands.

An inner call follows the rules the same call follows from an ordinary account, with the multisig as signer and owner. Its result is reported through the same outcomes (`pod_orders`, `pod_transfers`, `pod_withdrawals`, `pod_activity`). **A rejected inner call does not roll back its siblings**: the others still run and the multisig's nonce is still consumed.

**Orders.** An order placed by an inner call is owned by the multisig. Its id is derived as for any other order, with the call nonce as the nonce and the intent's position across the call's orderbook inner calls (market actions included, an inner `submitBatch` counted intent by intent) as the sequence:

```text
order_id = keccak256(abi.encode(address multisig, uint64 callNonce, uint32 sequence))
```

Its `tx_hash` is the `execute` transaction's hash. `cancel` and `update` from the multisig pass the owner check for orders the multisig owns, as they would for an ordinary owner. Inner `transfer` ids are derived the same way.

**`setConfig`** replaces the members and threshold under the rules of `create`. It applies as soon as its call runs, so the next call needs signatures from the new members.

### Withdrawals

An inner `Bridge.withdraw` withdraws from the multisig's balance to an address on the bridged chain, under the rules in the [Bridge precompile reference](bridge.md#withdrawing). Its withdrawal id is the **`execute` transaction's hash**: it is the key of `GET /v1/bridge/withdrawals/by-id/{tx_hash}`, `pod_getBridgeClaimProof` and the claim on the bridged chain. That is why a call carries at most one withdrawal. When the whole call is refused, no withdrawal exists and a by-id lookup of its hash returns not found.

### Market admin

A multisig address can be listed in the network's market-admin allowlist. Like any market admin, it must be on the list to send any of the market calls. It creates markets with an inner `createMarket` or `createMarketV2`, owns them, and manages them with inner `disableMarket`, `settleMarket`, `updateMarketOracle` and `transferMarket` calls. Another owner can hand it a market with `transferMarket`, which requires the new owner to be on the allowlist. See [Market lifecycle](orderbook.md#market-lifecycle).

## Outcomes

| Transaction | Receipt |
| --- | --- |
| `create` | success; failed when the address already holds a multisig |
| `execute`, call authorized | success, even when some or all inner calls are rejected |
| `execute`, call refused | failed |

The receipt of an `execute` reports whether the call was authorized and run, not what each inner call did. Inner calls get no receipts of their own; follow them through the multisig's outcomes and activity.

The reason for a failed receipt is in the [`pod_activity`](../json-rpc/README.md) entry of the account that sent it, and in `GET /v1/clob/activity/{account}`. A `multisig_created` or `multisig_call` entry carries `err`:

| `err` | Meaning |
| --- | --- |
| `address_taken` | `create`: the address already holds a multisig. |
| `no_multisig` | No multisig exists at the address. |
| `stale_nonce` | `Call.nonce` is below the multisig's nonce. |
| `premature` | `Call.nonce` is above the multisig's nonce. Send it again once the earlier calls have run. |
| `expired` | `validUntil` is before the batch that would run the call. |
| `too_far_ahead` | `validUntil` is more than 7 days past the batch that would run the call. |
| `below_threshold` | Fewer signatures than the threshold. |
| `invalid_signature` | A signature does not recover to an address, for example because `v` is 0 or 1 instead of 27 or 28. |
| `non_member` | A signature recovers to an address that is not a member. |
| `duplicate_signer` | Two signatures recover to the same member. |
| `unsupported_inner_call` | An inner call is not supported. |

The sender sees its entries, refusals included. The multisig's own feed shows a `create` only when it succeeded and a call only when it ran, so nobody can add entries to it by sending refused calls. A call that ran a `setConfig` carries the new `members` and `threshold`. Inner calls appear in the multisig's feed through the entries an ordinary account's intents produce (`order`, `transfer`, `bridge_transfer`, …).

## Reading a multisig

`GET /v1/multisig/{address}`, served by every node, returns the current configuration:

```json
{
  "members": ["0x4e5a…", "0xccb8…", "0xf7f2…"],
  "threshold": 2,
  "nonce": 3,
  "timestamp": 1794914886000000
}
```

`nonce` is the nonce the next call must carry. `timestamp` is the last batch the node has executed, in microseconds. An address that holds no multisig returns `404` with `{"timestamp": …}`. Pass `?timestamp=<µs>` to wait until the node has executed that batch, for example the batch of a receipt you just received; it is a lower bound, not a read of past state, and the node answers `503` if it does not get there within its wait.

## Limits

| Limit | Value |
| --- | --- |
| Members, and signatures per call | 16 |
| Inner call `data`, summed over a call | 4 KiB |
| `validUntil` past the batch that runs the call | 7 days |
| `setConfig` per call | 1 |
| `Bridge.withdraw` per call | 1 |

A transaction over the first two limits is rejected and never lands. The `validUntil` limit is checked when the call runs and refuses it as `too_far_ahead`.

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
