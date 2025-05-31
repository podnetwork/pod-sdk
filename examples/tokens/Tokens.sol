pragma solidity ^0.8.26;

import {requireQuorum} from "pod-sdk/pod/Quorum.sol";

contract Tokens {
    // ERC-20 metadata
    string  public name;
    string  public symbol;
    uint256 public totalSupply;

    mapping(address => uint256) private balances;

    event Transfer(address indexed from, address indexed to, uint256 value);

    constructor(
    string  memory tokenName,
    string  memory tokenSymbol,
        uint256 initialSupply
    ) {
        name = tokenName;
        symbol = tokenSymbol;
        totalSupply = initialSupply;
        balances[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(to != address(0),            "ERC20: transfer to the zero address");
        requireQuorum(_balances[msg.sender] >= amount, "ERC20: transfer amount exceeds balance");

        balances[msg.sender] -= amount;
        balances[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
}