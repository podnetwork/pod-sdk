! content id="smart-contract"

## Smart Contract Definition

The token layer transforms a basic smart contract into an independent ledger that tracks a fungible asset. 
Each deployed copy of the contract corresponds to a single currency, defined by its own name, ticker symbol, and fixed total supply.

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
        _balances.increment(symbol, tx.origin, totalSupply);
        emit Transfer(address(0), tx.origin, totalSupply);
    }

    function transfer(address to, int256 amount) external returns (bool) {
	_balances.requireGte(symbol, tx.origin, amount);
	_balances.decrement(symbol, tx.origin, amount);
	_balances.increment(symbol, to, amount);
        emit Transfer(tx.origin, to, amount);
        return true;
    }
}
```

! codeblock end

! sticky end

! content end
