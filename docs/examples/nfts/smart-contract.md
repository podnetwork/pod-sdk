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
pragma solidity ^0.8.26;

import {FastTypes} from "pod-sdk/solidity-sdk/src/pod/FastTypes.sol";

contract NFT {
    using FastTypes for FastTypes.Balance;

    FastTypes.Balance internal _balances;
    // tokenId -> uri
    mapping(uint256 => string) public tokensUri;

    address public deployer;

    constructor() {
        deployer = tx.origin;  // store the deployer address
    }

    event Minted(uint256 indexed tokenId, address indexed owner, string  uri);
    event Transferred(uint256 indexed tokenId, address indexed from, address indexed to);

    function transfer(address to, uint256 tokenId) external {
	_balances.requireGte(bytes32(tokenId), tx.origin, 1, "must be owner")
	_balances.decrement(bytes32(tokenId), tx.origin, 1);
	_balances.increment(bytes32(tokenId), to, 1);
        emit Transferred(tokenId, tx.origin, to);
    }

    function mint(uint256 tokenId, string uri) external {
        require(tx.origin == deployer, "not allowed to mint");

        tokensBalance[tx.origin][tokenId] = 1;
        tokensUri[tokenId] = uri;
        emit Minted(tokenId, tx.origin, uri);
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        return tokensUri[tokenId];
    }
}
```

! codeblock end

! sticky end

! content end
