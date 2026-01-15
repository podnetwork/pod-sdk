// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Attestation} from "./lib/Attestation.sol";

/**
 * @title Registry
 * @notice Manages a dynamic set of validators with historical snapshots for quorum verification.
 * This is the source of truth for what the active pod validator set is at any given timestamp.
 * @dev This contract maintains a bitmap-based validator set with the ability to create
 * historical snapshots for quorum verification of certificates signed by previously active committees.
 * It supports up to 255 validators
 * and uses bitmap operations for validator status tracking.
 * Additionally, the 255
 *
 *
 * @custom:security This contract is Ownable and should only be deployed with trusted ownership
 */
contract Registry is Ownable {
    struct Snapshot {
        uint256 expiryTimestamp; // timestamp at which the committee was updated
        uint256 bitmap; // active validator bitmap
        uint8 validatorCount; // n
        uint8 adverserialResilience; // f
    }

    error ValidatorIsZeroAddress();
    error ValidatorAlreadyExists();
    error MaxValidatorCountReached();
    error ValidatorDoesNotExist();
    error ValidatorNotBanned();

    error CallerNotValidator();
    error CallerAlreadyInactive();
    error CallerBanned();
    error CallerAlreadyActive();

    error InvalidSnapshotIndex();

    event ValidatorAdded(address indexed validator);
    event ValidatorRemoved(address indexed validator);
    event ValidatorBanned(address indexed validator);
    event ValidatorUnbanned(address indexed validator);
    event ValidatorDeactivated(address indexed validator);
    event ValidatorReactivated(address indexed validator);

    event SnapshotCreated(uint256 indexed activeAsOfTimestamp, uint256 bitmap);

    /**
     * @notice Maximum number of validators allowed in the registry
     * @dev IMPORTANT: This is a hard limit on the total number of validators that can ever be registered.
     * When a validator is banned/deactivated, their index position becomes permanently unavailable.
     * New validators cannot reuse the indices of removed validators, so the effective capacity
     * decreases over time. To maintain full capacity, you must either:
     * 1) Unban/reactivate the same validator, or
     * 2) Implement a validator replacement mechanism that reuses indices
     */
    uint256 constant MAX_VALIDATOR_COUNT = 255;

    // /**
    //  * @notice Number of snapshots to check when finding the closest snapshot to a given timestamp before
    //  * falling back to binary search.
    //  */
    // uint256 constant CHECK_COUNT = 3;

    Snapshot[] public history;
    // validator address to their 1-based index, 0 means not found
    mapping(address => uint8) public validatorIndex;
    address[] public validators;

    uint256 public activeValidatorBitmap;
    uint256 public bannedValidatorBitmap;
    uint8 public adverserialResilience;
    uint8 public validatorCount;

    constructor(address[] memory _validators, uint8 _adverserialResilience) Ownable(msg.sender) {
        if (_validators.length > MAX_VALIDATOR_COUNT) {
            revert MaxValidatorCountReached();
        }

        uint256 validatorsLength = _validators.length;
        for (uint8 i = 0; i < validatorsLength; ++i) {
            address validator = _validators[i];
            if (validator == address(0)) {
                revert ValidatorIsZeroAddress();
            }
            if (validatorIndex[validator] != 0) {
                revert ValidatorAlreadyExists();
            }
            validators.push(validator);
            validatorIndex[validator] = i + 1;
            activeValidatorBitmap = _setBit(activeValidatorBitmap, i);
        }

        validatorCount = uint8(_validators.length);
        adverserialResilience = _adverserialResilience;
    }

    function updateConfig(address[] memory newValidators, address[] memory removedValidators, uint8 newResilience)
        external
        onlyOwner
    {
        _createSnapshot();

        if (validators.length + newValidators.length > MAX_VALIDATOR_COUNT) {
            revert MaxValidatorCountReached();
        }

        uint256 newValidatorsLength = newValidators.length;
        for (uint256 i = 0; i < newValidatorsLength; ++i) {
            address validator = newValidators[i];
            if (validator == address(0)) {
                revert ValidatorIsZeroAddress();
            }

            if (validatorIndex[validator] != 0) {
                revert ValidatorAlreadyExists();
            }

            validators.push(validator);
            uint8 index = uint8(validators.length);
            validatorIndex[validator] = index;
            activeValidatorBitmap = _setBit(activeValidatorBitmap, index - 1);
            emit ValidatorAdded(validator);
        }

        uint256 removedValidatorsLength = removedValidators.length;
        for (uint256 i = 0; i < removedValidatorsLength; ++i) {
            address validator = removedValidators[i];
            uint8 index = validatorIndex[validator];
            if (index == 0 || !_isBitSet(activeValidatorBitmap, index - 1)) {
                revert ValidatorDoesNotExist();
            }

            activeValidatorBitmap = _clearBit(activeValidatorBitmap, index - 1);
            emit ValidatorRemoved(validator);
        }

        validatorCount = uint8(
            uint256(validatorCount) + newValidatorsLength - removedValidatorsLength
        );
        adverserialResilience = newResilience;
    }

    function banValidator(address validator) external onlyOwner {
        uint8 index = validatorIndex[validator];
        if (index == 0) {
            revert ValidatorDoesNotExist();
        }
        if (_isBitSet(bannedValidatorBitmap, index - 1)) {
            revert CallerBanned();
        }

        bannedValidatorBitmap = _setBit(bannedValidatorBitmap, index - 1);
        emit ValidatorBanned(validator);
    }

    function unbanValidator(address validator) external onlyOwner {
        uint8 index = validatorIndex[validator];
        if (index == 0) {
            revert ValidatorDoesNotExist();
        }
        if (!_isBitSet(bannedValidatorBitmap, index - 1)) {
            revert ValidatorNotBanned();
        }

        bannedValidatorBitmap = _clearBit(bannedValidatorBitmap, index - 1);
        emit ValidatorUnbanned(validator);
    }

    function deactivate(address validator) external {
        if (owner() != msg.sender && validator != msg.sender) {
            revert CallerNotValidator();
        }
        uint8 index = validatorIndex[validator];
        if (index == 0) {
            revert ValidatorDoesNotExist();
        }
        if (!_isBitSet(activeValidatorBitmap, index - 1)) {
            revert CallerAlreadyInactive();
        }

        _createSnapshot();
        activeValidatorBitmap = _clearBit(activeValidatorBitmap, index - 1);

        emit ValidatorDeactivated(validator);
    }

    function reactivate(address validator) external {
        if (owner() != msg.sender && validator != msg.sender) {
            revert CallerNotValidator();
        }
        uint8 index = validatorIndex[validator];
        if (index == 0) {
            revert ValidatorDoesNotExist();
        }

        if (_isBitSet(activeValidatorBitmap, index - 1)) {
            revert CallerAlreadyActive();
        }

        _createSnapshot();
        activeValidatorBitmap = _setBit(activeValidatorBitmap, index - 1);
        emit ValidatorReactivated(validator);
    }

    function _createSnapshot() internal {
        history.push(
            Snapshot({
                expiryTimestamp: block.timestamp,
                bitmap: activeValidatorBitmap,
                validatorCount: validatorCount,
                adverserialResilience: adverserialResilience
            })
        );
        emit SnapshotCreated(block.timestamp, activeValidatorBitmap);
    }

    function computeTxWeight(bytes32 txHash, bytes calldata aggregateSignature, uint64 epoch)
        public
        view
        returns (uint256 weight, uint256 n, uint256 f)
    {
        uint256 validatorBitmap;
        if (epoch > history.length) {
            revert InvalidSnapshotIndex();
        } else if (epoch == history.length) {
            validatorBitmap = activeValidatorBitmap;
            n = validatorCount;
            f = adverserialResilience;
        } else {
            Snapshot memory s = history[epoch];
            validatorBitmap = s.bitmap;
            n = s.validatorCount;
            f = s.adverserialResilience;
        }
        validatorBitmap &= ~bannedValidatorBitmap; // remove banned validators

        uint256 count = aggregateSignature.length / 65;
        for (uint256 i = 0; i < count; ++i) {
            address signer = Attestation.recoverSignerAt(txHash, aggregateSignature, i);
            uint8 index = validatorIndex[signer];
            if (index == 0) {
                continue;
            }

            uint256 mask = (1 << (index - 1));
            if ((validatorBitmap & mask) != 0) weight++; // found an active validator
            validatorBitmap &= ~mask; // clear bit to avoid double counting
        }
    }

    function getValidators(uint256 snapshotIndex) public view returns (address[] memory) {
        uint256 bitmap = history[snapshotIndex].bitmap;
        uint8 count = history[snapshotIndex].validatorCount;
        address[] memory subset = new address[](count);
        uint8 j = 0;
        uint256 validatorsLen = validators.length;
        for (uint8 i = 0; i < validatorsLen; ++i) {
            if (_isBitSet(bitmap, i)) {
                subset[j++] = validators[i];
            }
        }
        return subset;
    }

    function isValidatorBanned(address validator) external view returns (bool isBanned) {
        uint8 index = validatorIndex[validator];
        if (index == 0) {
            return false;
        }
        return _isBitSet(bannedValidatorBitmap, index - 1);
    }

    function getSnapshotAtIndex(uint256 snapshotIndex) external view returns (Snapshot memory) {
        return history[snapshotIndex];
    }

    function getHistoryLength() external view returns (uint256) {
        return history.length;
    }

    function _isBitSet(uint256 bitmap, uint8 i) internal pure returns (bool) {
        return (bitmap & (1 << i)) != 0;
    }

    function _setBit(uint256 bitmap, uint8 i) internal pure returns (uint256) {
        return bitmap | (1 << i);
    }

    function _clearBit(uint256 bitmap, uint8 i) internal pure returns (uint256) {
        return bitmap & ~(1 << i);
    }
}
