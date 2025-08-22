---
layout: simple
---

! content id="callWithState"

! anchor callWithState go-up
## Call With State

Simulates an EVM call against a supplied header and state on a specified chain. Executes the provided call in an ephemeral VM and returns the call's raw return bytes.

### Address

0xB4BBff8874b41f97535bC8dAFBaAff0DC5c72E5A

### Inputs

! table style1
| Byte range         | Name       | Description                                                                 |
| ------------------ | ---------- | --------------------------------------------------------------------------- |
| [0; I size]        | input (I)  | struct `EVMCallWithStateArgs` with `chainId`, `header`, `call`, and `state` |
! table end

The EVMCallWithStateArgs struct is defined as:
```solidity
struct EVMCallWithStateArgs {
    uint256 chainId;
    Header header;
    EVMCall call;
    EVMState state;
}

struct Header {
    bytes32 parentHash;
    bytes32 uncleHash;
    address coinbase;
    bytes32 root;
    bytes32 txHash;
    bytes32 receiptHash;
    bytes   bloom;
    uint256 difficulty;
    uint256 number;
    uint256 gasLimit;
    uint256 gasUsed;
    uint256 time;
    bytes   extra;
    bytes32 mixDigest;
    bytes8  nonce;
}

struct EVMCall {
    address from;
    address to;
    bytes   input;
}

struct EVMState {
    Account[] accounts;
}

struct Account {
    AccountProof proof;
    bytes code;
}

struct StorageProof {
    bytes32 key;
    bytes32 value;
    bytes[] proof;
}

struct AccountProof {
    address addr;
    bytes[] accountProof;
    uint256 balance;
    bytes32 codeHash;
    uint256 nonce;
    bytes32 storageHash;
    StorageProof[] storageProof;
}
```

### Output

! table style1
| Byte range         | Name       | Description                        |
| ------------------ | ---------- | ---------------------------------- |
| [0; R size]        | result (R) | Return bytes of the EVM execution  |
! table end

### Errors

- Out of gas if provided gas is less than base cost.
- Input must not be empty.
- Input decoding failed.
- Chain ID must fit in `uint64`.
- EVM creation failed (invalid header / state / account proofs / storage proofs).
- Returned empty output.
- Call failed or reverted.

### Gas Cost

Static gas: 500

Dynamic gas: gas used by the simulated EVM call

! content end


! content
! sticky

### Example

! codeblock title=""
```solidity
address internal constant EVM_CALL_WITH_STATE = address(
    uint160(uint256(keccak256("POD_EVM_CALL_WITH_STATE")))
);

function call_precompile(EVMCallWithStateArgs memory args) public view returns (bytes memory) {
    bytes memory inputData = abi.encode(
    args.chainId,
    args.header,
    args.call,
    args.state
    );

    (bool success, bytes memory returnData) = EVM_CALL_WITH_STATE.staticcall{ gas: gasleft() }(inputData);
    require(success, "Precompile call failed");

    return returnData;
}
```
! codeblock end

! sticky end
! content end