# JSON-RPC Errors

Errors returned by the Pod RPC server follow the standard [JSON-RPC 2.0](https://www.jsonrpc.org/specification#error_object) error format. In addition to the standard codes (`-32600`, `-32602`, `-32603`, etc.), Pod defines a small set of domain-specific codes for transaction validation, execution reverts, and account recovery.

## Error response format

Every error is returned as a JSON-RPC 2.0 error object:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32000,
    "message": "transaction validation failed",
    "data": "Insufficient balance"
  }
}
```

| Field     | Type             | Description                                                                 |
| --------- | ---------------- | --------------------------------------------------------------------------- |
| `code`    | integer          | Numeric error code (see below).                                             |
| `message` | string           | Short, human-readable description of the error category.                    |
| `data`    | string / object / array (optional) | Extra context. Its shape depends on the error code — see each entry below. |

## Pod error codes

| Code     | Message                       | Meaning                                                                                  |
| -------- | ----------------------------- | ---------------------------------------------------------------------------------------- |
| `3`      | `execution reverted`          | A contract-level (enshrined application) execution failed. `data` is an ABI-encoded revert. |
| `-32000` | `transaction validation failed` | A protocol-level validation check failed (nonce, balance, chain ID, gas price, …).      |
| `-32003` | `Transaction rejected: …`     | A quorum of validators rejected the transaction.                                          |
| `999`    | `Account locked`              | The account is locked pending recovery. `data` carries the recovery target.              |
| `-32020` … `-32023` | (see below)        | A websocket subscription was closed by the server. Delivered as a notification, not a response — see [Subscription close notifications](#subscription-close-notifications). |

### `3` — execution reverted

Returned when an enshrined application (the order book, optimistic auctions, ERC-20 tokens, the bridge, or minting) rejects a transaction at execution time. The response mirrors the EIP-1474 / geth-style execution revert so that standard wallets and libraries (viem, ethers, alloy) decode the reason automatically.

`data` is a hex string: the 4-byte `Error(string)` selector (`0x08c379a0`) followed by the ABI-encoded reason string.

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": 3,
    "message": "execution reverted",
    "data": "0x08c379a0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000204..."
  }
}
```

The decoded reason string is one of the contract-level [validation messages](#transaction-validation-messages) below (e.g. `CLOB validation failed: …`).

### `-32000` — transaction validation failed

Returned when a protocol-level check fails before the transaction is attested. `data` is a plain string holding the specific reason — one of the [validation messages](#transaction-validation-messages) below.

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32000,
    "message": "transaction validation failed",
    "data": "Future nonce: tx nonce 7, expected 5"
  }
}
```

### `-32003` — transaction rejected

Returned when at least `f + 1` validators reject a transaction (the rejection quorum). The `message` summarizes the distinct reasons; `data` is an array of objects, one per rejection.

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32003,
    "message": "Transaction rejected: Insufficient balance, Invalid chain ID: 1",
    "data": [
      { "error": "Insufficient balance" },
      { "error": "Invalid chain ID: 1" }
    ]
  }
}
```

### `999` — account locked

Returned when you submit a transaction for an account that is locked due to a pending recovery. `data` identifies the recovery target — see [Recover a locked account](guides/recover-locked-account.md).

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": 999,
    "message": "Account locked",
    "data": {
      "recovery_target": "0x…",
      "recovery_target_nonce": 12
    }
  }
}
```

| `data` field            | Type   | Description                                          |
| ----------------------- | ------ | ---------------------------------------------------- |
| `recovery_target`       | hash   | Transaction hash of the recovery target.             |
| `recovery_target_nonce` | number | Nonce of the recovery target.                        |

## Subscription close notifications

The codes above answer a request. A websocket subscription created with [`eth_subscribe`](json-rpc/openapi.yaml) can also be ended by the *server*, and that arrives as a notification rather than a response: same `eth_subscription` method as a normal update, but carrying `error` in place of `result`.

```json
{
  "jsonrpc": "2.0",
  "method": "eth_subscription",
  "params": {
    "subscription": "0x9c1f…",
    "error": {
      "code": -32020,
      "message": "subscription lagged behind the tick broadcast",
      "data": { "resumable": true, "missed": 42, "resume_since": 1718900000000000 }
    }
  }
}
```

The subscription is over once this arrives; nothing further is sent for it. The connection itself stays open, so any other subscription on it keeps working.

| Code     | Message                                             | What happened, and what to do                                                                                                                     |
| -------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `-32020` | `subscription lagged behind the tick broadcast`      | The server dropped ticks before this subscriber read them, rather than serve a stream with a gap in it. Resubscribe with `since` = `resume_since`. |
| `-32021` | `node is shutting down`                              | The node is going away. Reconnect (to another node, if you have one) and resubscribe with `since` = `resume_since`.                               |
| `-32022` | `subscriber did not accept a notification in time`   | The connection would not take a notification within the server's send timeout. Resubscribe with `since` = `resume_since` once you can keep up.     |
| `-32023` | `failed to serialize a subscription notification`    | A server-side bug. **Do not** retry in a loop — an immediate resubscribe will likely reproduce it. Please report it.                              |

| `data` field   | Type    | Description                                                                                                                                                        |
| -------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `resumable`    | boolean | Whether resubscribing recovers the stream. `false` only for `-32023`.                                                                                              |
| `resume_since` | number  | Solution time (µs) of the newest tick this subscription is square on — every update it owed you was delivered (a tick that matched none of your filters owed nothing, so it counts). Pass it back as `since`. Absent if it is square on nothing yet; then reuse your original `since`. |
| `resume_since_book` | string | `pod_orders_v2` only, and only when the batch it stopped in was partly delivered: the last `book` you were sent. Pass it back as `since_book` alongside `resume_since`. Absent when the batch landed whole. |
| `missed`       | number  | `-32020` only: how many ticks the broadcast dropped.                                                                                                               |

`resume_since` names a whole tick, because `since` selects whole ticks. So if the subscription closed midway through one, resuming redelivers that tick in full and you may see a few deltas twice. That is deliberate — a repeated delta is something a client can dedupe, whereas one that was never sent is unrecoverable.

`pod_orders_v2` is the exception, because it can resume inside a tick. A batch settles many orderbooks and is delivered as one frame each, so a close there also carries `resume_since_book`; pass both back and you receive exactly the frames you never got, with nothing replayed. That is the case the two-part cursor exists for — a close midway through a batch is precisely when you cannot tell where you got to, since frames the connection already accepted may not have reached your code yet.

A close is the **only** signal that a delta stream lost data — the stream itself never has holes. Treat the absence of updates as an idle market only while the subscription is open.

> **Client support.** Not every websocket client surfaces this frame, so check yours before relying on the reason being readable.
>
> - **`alloy` (Rust)** rejects a subscription notification carrying `error` and treats it as a connection error: it tears the websocket down and reconnects rather than surfacing the payload. You observe the close as a reconnect.
> - **`jsonrpsee` (Rust)** removes the subscription and discards the payload, so the stream ends with no reason attached.
> - **The pod TypeScript SDK** does not read `params.error` yet, so a close currently arrives as an update with an empty payload and the subscription is not dropped. Until that lands, treat a payload-less update as a possible close.
>
> To act on the reason with any of these, read the raw websocket frame. The subscription is over regardless of whether your client reports it.

## Transaction validation messages

The reason carried in `data` (for code `-32000`) or encoded inside the revert (for code `3`) is one of the following. Messages with `{…}` placeholders are filled in with the offending values.

### Protocol-level (returned with code `-32000`)

| Message                                                          | When it occurs                                                         |
| --------------------------------------------------------------- | --------------------------------------------------------------------- |
| `Invalid chain ID: {chain_id}`                                  | The transaction's chain ID does not match the network.                |
| `Transaction is blacklisted`                                    | The transaction is on the blocklist.                                  |
| `Account has pending transaction`                               | The account already has an unexecuted (pending) transaction.          |
| `Future nonce: tx nonce {tx_nonce}, expected {expected}`        | The nonce is higher than the account's next expected nonce.           |
| `Past nonce: tx nonce {tx_nonce}, expected {expected}`          | The nonce is lower than expected (already used).                      |
| `Insufficient balance`                                          | The account cannot cover the transaction.                             |
| `Underpriced tx: max_fee_per_gas {max_fee_per_gas} < base fee {base_fee}` | `maxFeePerGas` is below the current base fee.               |
| `Recovery validation failed: {reason}`                          | A recovery transaction failed validation.                             |

### Contract-level (returned with code `3`, inside the revert)

| Message                                          | When it occurs                                  |
| ------------------------------------------------ | ----------------------------------------------- |
| `CLOB validation failed: {reason}`               | Order book transaction validation failed.       |
| `Optimistic auction validation failed: {reason}` | Optimistic auction validation failed.           |
| `ERC20 validation failed: {reason}`              | ERC-20 token operation validation failed.       |
| `Bridge validation failed: {reason}`             | Bridge / cross-chain operation validation failed. |
| `Mint validation failed: {reason}`               | Mint operation validation failed.               |

## Standard JSON-RPC codes

Pod also returns the standard codes defined by the JSON-RPC 2.0 specification:

| Code     | Meaning          | Typical cause                                                        |
| -------- | ---------------- | ------------------------------------------------------------------- |
| `-32600` | Invalid Request  | Malformed request, or an unauthorized call to an admin-only method. |
| `-32602` | Invalid Params   | Parameters could not be parsed (e.g. a malformed hash or raw transaction). |
| `-32603` | Internal Error   | An internal server error while servicing the request.               |
