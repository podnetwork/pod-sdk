// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";

abstract contract AbsBonding is Ownable {
    uint256 public immutable bondAmount;

    mapping(address => bool) public isBonded;

    event Bonded(address indexed validator);
    event Unbonded(address indexed validator);
    event Slashed(address indexed validator);

    constructor(uint256 _bondAmount) Ownable(msg.sender) {
        bondAmount = _bondAmount;
    }

    modifier onlyBonded() {
        require(isBonded[msg.sender], "Not bonded");
        _;
    }

    function bond() external payable {
        require(!isBonded[msg.sender], "Already bonded");
        require(msg.value >= bondAmount, "Not enough bond");

        payable(msg.sender).transfer(bondAmount);

        isBonded[msg.sender] = true;
        emit Bonded(msg.sender);
    }

    function unbond() external onlyBonded {
        isBonded[msg.sender] = false;
        isBonded[msg.sender] = false;

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
