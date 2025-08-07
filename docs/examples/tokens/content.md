---
title: Tokens
layout: single

url: /examples/tokens

toc:
  smart-contract: Smart Contract
  transfer: Transfer
  events: Events
---

! content

# Tokens

### Creating a fungible token

Unlike traditional blockchains where token logic runs over globally ordered blocks, pod allows token contracts to enforce safety (e.g. no overdrafts) even when transactions are confirmed independently and concurrently.

This guide shows how to create and use a simple fungible token using `FastTypes.Balance`, a type provided by `pod-sdk` that integrates directly with pod’s validator quorum logic.


To get started, clone `podnetwork/pod-sdk` github repository and go to `examples/tokens` directory:

```bash clickToCopy
$ git clone github.com/podnetwork/pod-sdk && cd examples/tokens
```

! content end

---

! content id="smart-contract"

## Smart Contract Definition

As in the [ERC20 Token Standard](https://eips.ethereum.org/EIPS/eip-20), each `Token` contract instance corresponds to a single fungible token,
defined by its own name, ticker symbol, number of decimals, and fixed total supply.

The contract makes use of the [`FastTypes`](/smart-contract-development/solidity-sdk-reference) library provided by `pod-sdk`.

The `FastTypes.Balances` type provides

* `_balances.decrement(key, owner, value)`, a method that allows only the owner himself to decrease his balance,
* `_balances.increment(key, owner, value)`, that allows anyone to increase the balance of an owner

Unlike a plain Solidity mapping, when you call `decrement` method of a `FastTypes.Balance`, you're enforcing that a supermajority of validators agree the account has sufficient funds, up to the previous transaction by this account. That makes balance checks consistent across the network even without full consensus.

The `key` parameter is a string that allows namespacing for multiple balances by the same owner, but in this example we always use the variable `symbol` as the key, as there is only a single balance for each address.

! codeblock title="Token.sol"

```solidity
pragma solidity ^0.8.26;

import {FastTypes} from "pod-sdk/FastTypes.sol";

contract Token {
    using FastTypes for FastTypes.Balance;

    uint256 public totalSupply;
    uint8 public decimals;
    string  public name;
    string  public symbol;

    // This is a special type that is safe in the fast path of pod.
    // Checkout more about the type at https://docs.v1.pod.network/smart-contract-development/solidity-sdk-reference#balance
    FastTypes.Balance internal _balances;

    event Transfer(address indexed from, address indexed to, int256 value);

    constructor(
        string  memory tokenName,
        string  memory tokenSymbol,
        uint8 decimals,
        uint256 initialSupply
    ) {
        name = tokenName;
        symbol = tokenSymbol;
        decimals = decimals;
        totalSupply = initialSupply;
        _balances.increment(symbol, msg.sender, totalSupply);
        emit Transfer(address(0), msg.sender, totalSupply);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        // The decrement function ensures that the sender has enough balance
        _balances.decrement(symbol, msg.sender, amount);
        _balances.increment(symbol, to, amount);
        emit Transfer(msg.sender, to, amount);
        return true;
    }
}
```

! codeblock end

! content end

---

! content

## Deployment

! codeblock title="Deploying with forge"

```bash
$ forge create --rpc-url https://rpc.v1.dev.pod.network \
    --private-key $PRIVATE_KEY \
    contracts/Tokens.sol:Tokens \
    --broadcast \
    --constructor-args "token" "TKC" 9 1000000000000
```

! codeblock end

! content end

---

! content id="transfer"

## Transfer token programmatically

This example demonstrates how to transfer tokens programmatically.

! codeblock title="Token transfer"

```rust
use pod_sdk::{PodProvider, Wallet};
use alloy_sol::sol;
use alloy_core::types::*;
use alloy_primitives::B256;
use std::error::Error;

sol! {
    interface Token {
        function transfer(address to, uint256 amount) external;
    }
}

async fn transfer_tokens(pod_provider: &PodProvider, contract_address: Address, destination_address: Address, amount: U256) -> Result<(), Box<dyn Error>> {
    let contract = Token::new(contract_address, provider.clone());
    let call = contract.transfer(destination_address, amount).send().await?;
    let tx_hash = call.tx_hash();
    if let Some(receipt) = provider.get_transaction_receipt(*tx_hash).await? {
        println!("Tokens sent with receipt: {:?}", receipt);
    }
    Ok(())
}
```

! codeblock end

! content end

---

! content id="events"

## Transfer events

`Transfer` events are emitted on every token transfer.

Clients can request verifiable logs from the RPC full nodes. These proofs can be verified locally if the RPC node is not trusted, or submitted to light clients, ie smart contracts in other blockchains that verify that an event was emitted in pod.

! codeblock title="Token events"

```rust
use pod_sdk::{PodProvider, Committee};
use alloy_core::types::*;
use alloy_core::log::Filter;
use std::error::Error;

sol! {
    interface Token {
        event Transfer(address indexed from, address indexed to, uint256 value);
    }
}

async fn event_transfer(pod_provider: &PodProvider, committee: &Committee, destination_address: Address, rpc_is_trusted: bool) -> Result<(), Box<dyn Error>> {
    // Filter transfer by specifying a destination address
    let filter = Filter::new().event_signature(Transfer::SIGNATURE).topic1(destination_address);
    let logs = pod_provider.get_verifiable_logs(&filter).await?;
    for log in logs {
        if rpc_is_trusted || log.verify(committee)? {
            println!("Verified transfer at {:?}: {:?}", log.confirmation_time(), log);
        }
    }
    Ok(())
}
```

! codeblock end

! content end
