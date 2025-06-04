pragma solidity ^0.8.26;

import {requireQuorum} from "pod-sdk/pod/Quorum.sol";

contract Tokens {
    string  public name;
    string  public symbol;
    int256 public totalSupply;

    mapping(address => int256) private balances;

    event Transfer(address indexed from, address indexed to, int256 value);

    constructor(
    string  memory tokenName,
    string  memory tokenSymbol,
        int256 initialSupply
    ) {
        name = tokenName;
        symbol = tokenSymbol;
        totalSupply = initialSupply;
        balances[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }

    function balanceOf(address account) external view returns (int256) {
        return balances[account];
    }

    function transfer(address to, int256 amount) external returns (bool) {
        require(to != address(0),            "transfer to the zero address");
        requireQuorum(balances[msg.sender] >= amount, "transfer amount exceeds balance");

        balances[msg.sender] -= amount;
        balances[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
}