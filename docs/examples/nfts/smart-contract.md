! content id="smart-contract"

## Smart Contract Definition

The NFT layer converts a simple smart contract into an on-chain registry of unique, non-fungible items.
Each deployed instance represents one collection whose ledger maps every distinct token ID to its current owner while exposing a metadata URI that gives each asset its individual identity.


! content end

! content

Below is the interface of the contract that implements this system:

! sticky

! codeblock

```rust
pragma solidity ^0.8.25;

contract NFTs {
    mapping(uint256 => address) public tokensOwners;

    event Minted(uint256 indexed tokenId, address indexed owner, string  uri);
    event Transferred(uint256 indexed tokenId, address indexed from, address indexed to);

    function mint(uint256 tokenId,string calldata uri) external;
    function tokenURI(uint256 tokenId) external view returns (string memory);
    function safeTransfer(uint256 id, address to) external;
}
```

! codeblock end

! sticky end

! content end
