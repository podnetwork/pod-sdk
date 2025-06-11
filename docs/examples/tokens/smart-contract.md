! content id="smart-contract"

## Smart Contract Definition

The token layer transforms a basic smart contract into an independent ledger that tracks a fungible asset. 
Each deployed copy of the contract corresponds to a single currency, defined by its own name, ticker symbol, and fixed total supply.

! content end

! content

Below is the interface of the contract that implements this system:

! sticky

! codeblock

```rust
pragma solidity ^0.8.25;

contract Tokens {
    mapping(address => uint256) private balances;

    event Transfer(address indexed from, address indexed to, uint256 value);
    
    function balanceOf(address account) external;
    function transfer(address to, uint256 amount) external;
}
```

! codeblock end

! sticky end

! content end
