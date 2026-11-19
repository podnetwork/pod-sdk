# Multisig

The Multisig precompile creates multisig accounts. A multisig is an account that acts only when enough of its members sign. Each member is an ordinary account with its own key. The threshold is the number of member signatures that a call needs.

A multisig has its own address, balances, positions and orders. No single key can move its funds. You can replace members, and the address stays the same.

A multisig uses the call format of Safe v1.3.0 and later. Safe calls the members of a Safe its owners. The members sign a Safe transaction (`SafeTx`) off-chain and send the signatures to each other. Then any account sends one `execTransaction` transaction to the address of the multisig. Pod has no on-chain approval transaction and no store of pending approvals. For a procedure with examples, see [Use a multisig](../guides/use-a-multisig.md).

{% hint style="info" %}
Multisig precompile address: `0x50d0000000000000000000000000000000000004`
{% endhint %}

## Functions

| Function | Sent to | Sender |
| --- | --- | --- |
| `create(address[] members, uint16 threshold, bytes32 salt)` | the precompile | any account |
| `execTransaction(...)` | the address of the multisig | any account that has enough member signatures |
| `addOwnerWithThreshold`, `removeOwner`, `swapOwner`, `changeThreshold` | the address of the multisig | only the multisig, as the inner call of an `execTransaction` |

`create` follows these rules:

* `members` is in strictly ascending order: sorted by address, with no duplicates.
* `members` has 16 addresses or fewer.
* No member is the zero address, the address `0x0000000000000000000000000000000000000001` or the address of the new multisig. These addresses can never sign.
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
* A member change does not change the address.
* No private key exists for the address. The address can receive funds like any other address, but it can act only through `execTransaction`.

This address rule is not the address rule of the Safe proxy factory.

## Funding

The balances of a multisig are the balances of its address. You fund it like any other account. You can make a bridge deposit to the multisig (see [Bridge to Pod](../guides/bridge-to-pod.md)). You can also send an orderbook `transfer` from another account (see [Transfers between accounts](orderbook.md#transfers-between-accounts)). You can send funds before you create the multisig.

## The signed call

A call is the `SafeTx` that the members sign. It holds one inner call: the call that the multisig makes, for example an order or a withdrawal. The fields `to`, `value` and `data` give the inner call.

```solidity
struct SafeTx {
    address to;
    uint256 value;
    bytes data;
    uint8 operation;
    uint256 safeTxGas;
    uint256 baseGas;
    uint256 gasPrice;
    address gasToken;
    address refundReceiver;
    uint256 nonce;
}
```

The members sign the `SafeTx` as EIP-712 typed data with this domain:

| Domain field | Value |
| --- | --- |
| `chainId` | the chain id of the network (`eth_chainId`) |
| `verifyingContract` | the address of the multisig, not the address of the precompile |

The domain has no `name` and no `version`, as in Safe. The domain binds a signature to one multisig on one chain. A signature for a different multisig or chain recovers to an address that is not a member.

This is the `eth_signTypedData_v4` payload for a call that withdraws through the bridge:

```json
{
  "types": {
    "EIP712Domain": [
      { "name": "chainId", "type": "uint256" },
      { "name": "verifyingContract", "type": "address" }
    ],
    "SafeTx": [
      { "name": "to", "type": "address" },
      { "name": "value", "type": "uint256" },
      { "name": "data", "type": "bytes" },
      { "name": "operation", "type": "uint8" },
      { "name": "safeTxGas", "type": "uint256" },
      { "name": "baseGas", "type": "uint256" },
      { "name": "gasPrice", "type": "uint256" },
      { "name": "gasToken", "type": "address" },
      { "name": "refundReceiver", "type": "address" },
      { "name": "nonce", "type": "uint256" }
    ]
  },
  "primaryType": "SafeTx",
  "domain": {
    "chainId": 1293,
    "verifyingContract": "0x<multisig address>"
  },
  "message": {
    "to": "0x50d0000000000000000000000000000000000001",
    "value": 0,
    "data": "0x<abi-encoded call>",
    "operation": 0,
    "safeTxGas": 0,
    "baseGas": 0,
    "gasPrice": 0,
    "gasToken": "0x0000000000000000000000000000000000000000",
    "refundReceiver": "0x0000000000000000000000000000000000000000",
    "nonce": 0
  }
}
```

Pod supports a part of what the fields allow:

| Field | Value |
| --- | --- |
| `to`, `data` | The target and the ABI-encoded calldata of the inner call (see [Inner calls](#inner-calls)). |
| `value` | 0 when `data` is not empty. With empty `data`, any value (see [Native transfers](#native-transfers)). |
| `operation` | 0 (CALL). Pod has no DELEGATECALL. |
| `safeTxGas`, `baseGas`, `gasPrice` | 0. Pod pays no refunds to the sender. |
| `gasToken`, `refundReceiver` | The zero address. |
| `nonce` | The nonce of the multisig when the call runs (see [Nonces](#nonces)). |

The `execTransaction` transaction has the same fields except `nonce`, and adds `signatures`. Its own `value` must be 0. Pod rejects a transaction that breaks one of these rules. The transaction does not land.

### Signatures

`signatures` is one byte string in the format of Safe: entries of 65 bytes, `r || s || v`. Put the entries in ascending order of signer address. Pod reads the first `threshold` entries and ignores the rest. Each signer must be a current member and must have a higher address than the signer before it.

| `v` | Signature |
| --- | --- |
| 27, 28 | ECDSA over the EIP-712 hash of the `SafeTx`. `eth_signTypedData_v4` returns this format. |
| 31, 32 | `eth_sign` of the hash, with 4 added to `v`. Use this kind for a signer that cannot sign typed data. |
| 1 | Approval by the sender of the transaction. `r` holds the address of the sender, padded on the left to 32 bytes. The sender must be a member. |

Pod refuses an entry with any other `v`. Pod has no `approveHash` and no contract signatures (EIP-1271).

A signature counts only if its signer is a member when the call runs. When a member change removes a member, the signatures of that member stop counting. This includes signatures that the member made before the change.

### Safe tools

A tool that signs a Safe transaction can sign a multisig call. Examples are a hardware wallet, the hashing helpers of Safe's protocol-kit, and safe-eth-py. Give the tool the nonce, the chain id and a Safe version of 1.3.0 or later.

The multisig address has no code and no Safe views, for example `getOwners()` and `nonce()`. Thus tools that read the Safe first do not work. Examples are the `Safe` class of protocol-kit and the Safe web app.

## Nonces

Each multisig has its own nonce. The nonce starts at 0. You can read it from [`GET /v1/multisig/{address}`](#reading-a-multisig). Each call that runs increases the nonce by one.

`execTransaction` has no nonce argument. Pod uses the nonce of the multisig when the call runs to calculate the `SafeTx` hash. Thus a call that members signed for a different nonce recovers to different addresses, and Pod refuses it as `non_member`.

Pod runs the calls for one multisig in a batch in the order of their transaction hashes. Each call uses the nonce that the call before it left. If the call for nonce N + 1 comes before the call for nonce N, Pod refuses it. Send it again in a new transaction with the same signatures. The same thing happens on Ethereum when a block puts a Safe transaction before the transaction for the previous nonce.

A signed call does not expire. It stays valid until the nonce of the multisig moves past it. To cancel a signed call that nobody sent, run a different call with the same nonce. Usually this call has empty `data` and a `value` of 0. It runs nothing and only uses the nonce.

When Pod refuses a call, the nonce of the multisig does not change and the inner call does not run. The `execTransaction` transaction also has its own transaction nonce. That nonce belongs to the sender account, and the transaction uses it in both cases.

## Inner calls

| `to` | `data` | Result |
| --- | --- | --- |
| Orderbook `0x50d0…0002` | `submitOrder` (both forms), `cancel`, `update`, `submitTrigger`, `cancelTrigger`, `updateTrigger`, `setMaxLeverage`, `transfer`, or `submitBatch` of these | intents of the multisig, in the batch that runs the call |
| Orderbook `0x50d0…0002` | `createMarket`, `createMarketV2`, `disableMarket`, `settleMarket`, `updateMarketOracle`, `transferMarket` | a market action that the multisig signs (see [Market admin](#market-admin)) |
| Bridge `0x50d0…0001` | `withdraw` | a withdrawal from the balance of the multisig (see [Withdrawals](#withdrawals)) |
| The address of the multisig | `addOwnerWithThreshold`, `removeOwner`, `swapOwner`, `changeThreshold` | a change of members or threshold (see [Member changes](#member-changes)) |
| Any address except a precompile | empty, with `value` more than 0 | a transfer of the native token (see [Native transfers](#native-transfers)) |
| Any address | empty, with `value` 0 | nothing. The call only uses the nonce. |

All other targets and calls make the full transaction incorrect. Examples are `delegated`, a call to the multisig precompile, and calldata to an unknown address. Pod rejects such a transaction, and it does not land.

Each transaction has one inner call. An inner `submitBatch` can still place several orders. To withdraw and trade, send two calls with consecutive nonces.

An inner call follows the rules for the same call from an ordinary account. The multisig is the signer and the owner. Pod reports the result through the same outcomes as for an ordinary account (`pod_orders`, `pod_transfers`, `pod_withdrawals`, `pod_activity`). The `deadline` fields of inner calls do not limit when the call runs.

If Pod rejects the intents of an authorized call, the call still uses the nonce of the multisig.

### Orders

The multisig owns the orders that its inner calls place. The order id uses the same formula as for all other orders:

```text
order_id = keccak256(abi.encode(address multisig, uint64 callNonce, uint32 sequence))
```

`callNonce` is the nonce of the call. `sequence` is the position of the intent in an inner `submitBatch`, and 0 for a single call. The `tx_hash` of the order is the hash of the `execTransaction` transaction. The id of an inner `transfer` uses the same formula.

The multisig can `cancel` and `update` the orders that it owns, as an ordinary owner can.

### Member changes

The four functions of Safe change the members and the threshold. The inner call has the address of the multisig as `to`.

| Function | Effect |
| --- | --- |
| `addOwnerWithThreshold(owner, threshold)` | Adds `owner` and sets the threshold. |
| `removeOwner(prevOwner, owner, threshold)` | Removes `owner` and sets the threshold. |
| `swapOwner(prevOwner, oldOwner, newOwner)` | Replaces `oldOwner` with `newOwner`. The threshold does not change. |
| `changeThreshold(threshold)` | Sets the threshold. |

`prevOwner` is the member just below the target member in address order. If the target is the lowest member, `prevOwner` is `0x0000000000000000000000000000000000000001`. Safe has the same rule. In Safe, `prevOwner` is the previous entry in its list of owners.

Pod refuses the full call as `invalid_owner_change` in these cases:

* An added member is already a member.
* A removed or replaced member is not a member.
* `prevOwner` is not correct.
* After the change, the threshold is 0 or more than the number of members.
* After the change, the multisig has more than 16 members.

Pod rejects a member change with the zero address, `0x…0001` or the multisig itself as a member, and a threshold of 0. That transaction does not land.

The change applies when its call runs. The next call needs signatures from the new members.

### Native transfers

A call with empty `data` and a `value` more than 0 sends `value` of the native token from the multisig to `to`. It is the same transfer as a value transfer from an ordinary account, with the multisig as sender. `to` must not be a precompile.

### Withdrawals

An inner `Bridge.withdraw` sends funds from the balance of the multisig to an address on the bridged chain. It follows the rules in the [Bridge precompile reference](bridge.md#withdrawing).

The withdrawal id is the hash of the `execTransaction` transaction. You use this hash with `GET /v1/bridge/withdrawals/by-id/{tx_hash}`, with `pod_getBridgeClaimProof`, and for the claim on the bridged chain. If Pod refuses the call, no withdrawal exists, and a lookup by its hash returns not found.

### Market admin

The network keeps an allowlist of market admins. A multisig address can be on this allowlist. A market admin must be on the allowlist to send any market call, and a multisig is no exception.

A multisig on the allowlist creates markets with an inner `createMarket` or `createMarketV2`, and owns them. It manages them with inner `disableMarket`, `settleMarket`, `updateMarketOracle` and `transferMarket` calls. Another owner can give a market to the multisig with `transferMarket`. `transferMarket` requires that the new owner is on the allowlist. See [Market lifecycle](orderbook.md#market-lifecycle).

## Outcomes

| Transaction | Receipt |
| --- | --- |
| `create` | success, or failed if the address already holds a multisig |
| `execTransaction`, call authorized | success, also if Pod rejects the intents of the inner call |
| `execTransaction`, call refused | failed |

The receipt of an `execTransaction` shows only whether the call was authorized and ran. It does not show the result of the inner call. To follow the inner call, read the outcomes and the activity of the multisig.

To find why a receipt failed, read the activity of the sender account. The activity is in the [`pod_activity`](../json-rpc/README.md) stream and in `GET /v1/clob/activity/{account}`. A `multisig_created` or `multisig_call` entry has an `err` field:

| `err` | Meaning |
| --- | --- |
| `address_taken` | `create`: the address already holds a multisig. |
| `member_cannot_sign` | `create`: a member is the zero address, `0x…0001` or the multisig itself. |
| `no_multisig` | No multisig exists at the address. |
| `below_threshold` | The call has fewer signatures than the threshold. |
| `invalid_signature` | `signatures` is not a list of 65-byte entries, or an entry does not recover to an address. For example, `v` is 0. |
| `non_member` | A signature recovers to an address that is not a member. A call signed for a different nonce also gets this error. |
| `unordered_signers` | The signers are not in ascending order of address, or one signer signed twice. |
| `invalid_owner_change` | A member change does not apply to the current members (see [Member changes](#member-changes)). |
| `unsupported_inner_call` | Pod does not support the inner call or a field value. |

The sender sees all of its entries, refused ones included. The `nonce` of a refused call is the nonce of the multisig when Pod tried the call, or 0 for `no_multisig`. The activity of the multisig shows a `create` only if it succeeded, and a call only if it ran. Thus other accounts cannot add entries to it with refused calls.

If a call changed the members, its entry has the new `members` and `threshold`. Inner calls show in the activity of the multisig as the usual entries for intents: `order`, `transfer`, `bridge_transfer`, and the other kinds.

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
* `members` is in address order. Use this order to find `prevOwner` for a member change.
* `timestamp` is the last batch that the node ran, in microseconds.
* If the address holds no multisig, the node returns `404` with `{"timestamp": …}`.

You can add `?timestamp=<µs>`. The node then waits until it has run that batch, for example the batch of a receipt that you received. The value is a lower limit. It does not read an earlier state. If the node does not get to that batch during its wait time, it returns `503`.

## Limits

| Limit | Value |
| --- | --- |
| Members | 16 |
| Signature entries in one call | 16 |
| `data` of the inner call | 4 KiB |
| Inner calls in one call | 1 |

Pod rejects a transaction above these limits, and the transaction does not land. A member change that makes more than 16 members is refused when it runs, as `invalid_owner_change`.

## Interface

```solidity
interface IPodMultisig {
    /// @notice Open a multisig at the CREATE2 address with deployer 0x50d0…0004, `salt`
    ///         and init code hash keccak256(abi.encode(members, threshold)).
    /// @dev Anyone may send it. `members` strictly ascending, at most 16, none of them
    ///      0x0, 0x…01 or the new multisig; 1 <= threshold <= members.length.
    ///      Fails when the address already holds a multisig.
    function create(address[] calldata members, uint16 threshold, bytes32 salt) external;
}

/// @notice Functions at the multisig's own address, as in Safe v1.3.0 and later.
interface IPodMultisigAccount {
    /// @notice Run one inner call as the multisig. Sent to the multisig's address.
    /// @dev The members sign SafeTx under the EIP-712 domain {chainId, verifyingContract: multisig},
    ///      with `nonce` the multisig's nonce when the call runs. `signatures` is Safe's packed
    ///      r||s||v entries, signers in ascending order. operation, safeTxGas, baseGas, gasPrice,
    ///      gasToken, refundReceiver and the transaction's value must be 0; `value` must be 0
    ///      unless `data` is empty.
    function execTransaction(
        address to,
        uint256 value,
        bytes calldata data,
        uint8 operation,
        uint256 safeTxGas,
        uint256 baseGas,
        uint256 gasPrice,
        address gasToken,
        address payable refundReceiver,
        bytes calldata signatures
    ) external payable returns (bool success);

    /// @notice Member changes. Only as the inner call of an execTransaction to the multisig itself.
    ///         `prevOwner` is the member just below the target in address order, or 0x…01 for the lowest.
    function addOwnerWithThreshold(address owner, uint256 threshold) external;
    function removeOwner(address prevOwner, address owner, uint256 threshold) external;
    function swapOwner(address prevOwner, address oldOwner, address newOwner) external;
    function changeThreshold(uint256 threshold) external;
}
```
