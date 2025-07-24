// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IPodRegistry {
    function computeWeight(address[] memory subset) external view returns (uint256 weight);
    function getFaultTolerance() external view returns (uint8);
}

contract PodRegistry is IPodRegistry, Ownable {
    uint256 constant MAX_VALIDATOR_COUNT = 255;

    mapping(address => uint8) public validatorIndex;

    uint256 public validatorBitmap;
    uint8 public validatorCount;
    uint8 public nextValidatorIndex;

    event ValidatorAdded(address indexed validator);
    event ValidatorRemoved(address indexed validator);
    event ValidatorDeactivated(address indexed validator);
    event ValidatorReactivated(address indexed validator);

    constructor(address[] memory initialValidators) Ownable(msg.sender) {
        for (uint8 i = 0; i < initialValidators.length; i++) {
            _addValidator(initialValidators[i]);
        }
    }

    function addValidator(address validator) external onlyOwner {
        _addValidator(validator);
    }

    function _addValidator(address validator) internal {
        require(validator != address(0), "pod: validator is the zero address");
        require(validatorIndex[validator] == 0, "pod: validator already exists");
        require(nextValidatorIndex < MAX_VALIDATOR_COUNT, "pod: max validator count reached");
        uint8 index = ++nextValidatorIndex;
        validatorIndex[validator] = index;
        validatorBitmap |= (1 << (index - 1));
        validatorCount++;
        emit ValidatorAdded(validator);
    }

    function removeValidator(address validator) external onlyOwner {
        _removeValidator(validator);
    }

    function _removeValidator(address validator) internal {
        uint8 index = validatorIndex[validator];
        require(index != 0, "pod: validator does not exist");
        validatorBitmap &= ~(1 << (index - 1));
        delete validatorIndex[validator];
        validatorCount--;
        emit ValidatorRemoved(validator);
    }

    function deactivate() external {
        uint8 index = validatorIndex[msg.sender];
        require(index != 0, "pod: caller is not a validator");
        uint256 mask = 1 << (index - 1);
        require((validatorBitmap & mask) != 0, "pod: caller is already inactive");
        validatorBitmap &= ~mask;
        emit ValidatorDeactivated(msg.sender);
    }

    function reactivate() external {
        uint8 index = validatorIndex[msg.sender];
        require(index != 0, "pod: caller is not a validator");
        uint256 mask = 1 << (index - 1);
        require((validatorBitmap & mask) == 0, "pod: caller is already active");
        validatorBitmap |= mask;
        emit ValidatorReactivated(msg.sender);
    }

    function computeWeight(address[] memory subset) public view returns (uint256 weight) {
        uint256 counted = 0;
        for (uint8 i = 0; i < subset.length; i++) {
            uint8 index = validatorIndex[subset[i]];

            if (index == 0) {
                continue;
            }

            uint256 mask = 1 << (index - 1);
            if ((validatorBitmap & mask) != 0 && (counted & mask) == 0) {
                counted |= mask;
                weight++;
            }
        }
    }

    function getFaultTolerance() external view returns (uint8) {
        return validatorCount / 3;
    }
}
