---
title: Tokens 
layout: single

url: /examples/tokens

toc:
  smart-contract: Smart Contract
  mint: Minting a token
  transfer: Transfer
---

# NFTs

This guide demonstrates how to create ERC-721-like non-fungible token smart contracts on pod.

To get started, git clone `podnetwork/pod-sdk` github git repository and go to `examples/nfts`:

```bash
 $ git clone https://github.com/podnetwork/pod-sdk.git && cd pod-sdk/examples/nfts
```

---

! anchor smart-contract

## Smart Contract Definition

Each deployed instance represents one collection that maps every distinct token ID to its current owner while exposing a metadata URI that gives each asset its individual identity.


! codeblock title="NFT.sol"

```solidity
pragma solidity ^0.8.26;

import {FastTypes} from "pod-sdk/FastTypes.sol";

contract NFT {
    using FastTypes for FastTypes.Balance;

    FastTypes.Balance internal _balances;
    mapping(uint256 => string) public tokensUri;

    address public _minter;

    constructor(address minter) {
        _minter = minter;
    }

    event Minted(uint256 indexed tokenId, address indexed owner, string  uri);
    event Transferred(uint256 indexed tokenId, address indexed from, address indexed to);

    function transfer(address to, uint256 tokenId) external {
        _balances.decrement(bytes32(tokenId), msg.sender, 1);
        _balances.increment(bytes32(tokenId), to, 1);
        emit Transferred(tokenId, msg.sender, to);
    }

    function mint(uint256 tokenId, string uri) external {
        require(msg.sender == _minter, "not allowed to mint");

	_balances.increment(bytes32(tokenId), tx.origin, 1);
        tokensUri[tokenId] = uri;
        emit Minted(tokenId, msg.sender, uri);
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        return tokensUri[tokenId];
    }
}
```

! codeblock end

---

! anchor mint

## Mint an NFT

The minter is a permissioned account that can mint NFTs given a Uniform Resource Identifier (URI).

Mints are tracked via the `Minted` event. 

! codeblock title="mint.rs"

```rust
use pod_sdk::{PodProvider, Wallet};
use alloy_sol::sol;
use alloy_core::types::*;
use alloy_primitives::B256;
use std::error::Error;

sol! {
    interface NFTs {
        event Minted(uint256 indexed tokenId, address indexed owner, string  uri);
        
        function mint(uint256 tokenId, string calldata uri) external;
    }
}

async fn mint_nft(pod_provider: &PodProvider, contract_address: Address, token_id: U256, uri: U256) -> Result<(), Box<dyn Error>> {
    let contract = Tokens::new(contract_address, provider.clone());
    let call = contract.mint(token_id, uri).send().await?;
    let tx_hash = call.tx_hash();
    let response = provider.get_transaction_receipt(*tx_hash).await?;
    if let Some(receipt) = tx.get_receipt().await? {
        println!("NFT minted with receipt: {:?}", receipt);
    }
    Ok(())
}
```

! codeblock end

---

! anchor transfer

## Transfer token

Users can transfer an NFT from one address to another.

Transfers are tracked via the `Transferred` event.

! codeblock title="transfer.rs"

```rust
use pod_sdk::{PodProvider, Wallet};
use alloy_sol::sol;
use alloy_core::types::*;
use alloy_primitives::B256;
use std::error::Error;

sol! {
    interface Tokens {
        event Transferred(uint256 indexed tokenId, address indexed from, address indexed to);
        
        function safeTransfer(uint256 id, address to) external
    }
}

async fn transfer_nft(pod_provider: &PodProvider, contract_address: Address, destination_address: Address, token_id: U256) -> Result<(), Box<dyn Error>> {
    let contract = Tokens::new(contract_address, provider.clone());
    let call = contract.safeTransfer(destination_address, token_id).send().await?;
    let tx_hash = call.tx_hash();
    let response = provider.get_transaction_receipt(*tx_hash).await?;
    if let Some(receipt) = tx.get_receipt().await? {
        println!("NFT sent with receipt: {:?}", receipt);
    }
}
```

! codeblock end
