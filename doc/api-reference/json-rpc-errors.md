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
