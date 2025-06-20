---
layout: simple
---

! content id="smart-contract"

## Smart Contract Definition

As in the [ERC20 Token Standard](https://eips.ethereum.org/EIPS/eip-20), each `Token` contract instance corresponds to a single fungible token, 
defined by its own name, ticker symbol, number of decimals, and fixed total supply.

The contract makes use of the [`FastTypes`](http://localhost:5173/smart-contract-development/solidity-sdk-reference) library provided by `pod-sdk`.

The `FastTypes.Balances` type provides

* `_balances.decrement(key, owner, value)`, a method that allows only the owner himself to decrease his balance,
* `_balances.increment(key, owner, value)`, that allows anyone to increase the balance of an owner

Unlike a plain Solidity mapping, when you call `decrement` method of a `FastTypes.Balance`, you're enforcing that a supermajority of validators agree the account has sufficient funds, up to the previous transaction by this account. That makes balance checks consistent across the network even without full consensus.

The `key` parameter is a string that allows namespacing for multiple balances by the same owner, but in this example we always use the variable `symbol` as the key, as there is only a single balance for each address.

! content end

! content

! sticky

! codeblock

```solidity
pragma solidity ^0.8.26;

import "pod-sdk/pod/FastTypes.sol";

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

! sticky end

! content end