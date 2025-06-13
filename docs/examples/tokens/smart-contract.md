! content id="smart-contract"

## Smart Contract Definition

Each contract instance corresponds to a single fungible token, 
defined by its own name, ticker symbol, and fixed total supply.

<explain the contract:   

! content end

! content

! sticky

! codeblock

```solidity
pragma solidity ^0.8.26;

import "pod-sdk/pod/FastTypes.sol";

contract Token {
    using FastTypes for FastTypes.Balance;

    string  public name;
    string  public symbol;
    int256 public totalSupply;

    // This is a special type that is safe in the fast path of pod.
    // Checkout more about the type at https://pod-sdk.github.io/pod-sdk/docs/fast-types
    FastTypes.Balance internal _balances;

    event Transfer(address indexed from, address indexed to, int256 value);

    constructor(
        string  memory tokenName,
        string  memory tokenSymbol,
        int256 initialSupply
    ) {
        name = tokenName;
        symbol = tokenSymbol;
        totalSupply = initialSupply;
        _balances.increment(symbol, msg.sender, totalSupply);
        emit Transfer(address(0), msg.sender, totalSupply);
    }

    function transfer(address to, int256 amount) external returns (bool) {
        // The decrement function ensures that the sender has enough balance
	    _balances.decrement(symbol, msg.sender, amount);
        _balances.increment(symbol, to, amount);
        emit Transfer(tx.origin, to, amount);
        return true;
    }
}
```

! codeblock end

! sticky end

! content end
