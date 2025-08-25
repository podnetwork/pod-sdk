// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "openzeppelin-contracts/access/Ownable.sol";

abstract contract AbsBonding is Ownable {
    uint256 public immutable BOND_AMOUNT;

    mapping(address => bool) public isBonded;

    event Bonded(address indexed validator);
    event Unbonded(address indexed validator);
    event Slashed(address indexed validator);

    constructor(uint256 _bondAmount) Ownable(msg.sender) {
        BOND_AMOUNT = _bondAmount;
    }

    modifier onlyBonded() {
        require(isBonded[msg.sender], "Not bonded");
        _;
    }

    function bond() external payable {
        require(!isBonded[msg.sender], "Already bonded");
        require(msg.value >= BOND_AMOUNT, "Not enough bond");

        isBonded[msg.sender] = true;
        emit Bonded(msg.sender);
    }

    function unbond() external onlyBonded {
        isBonded[msg.sender] = false;
        payable(msg.sender).transfer(BOND_AMOUNT);

        emit Unbonded(msg.sender);
    }

    function slash(address validator) internal onlyBonded {
        isBonded[validator] = false;

        emit Slashed(validator);
    }

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
