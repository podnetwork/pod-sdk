// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IPodRegistry} from "./interfaces/IPodRegistry.sol";

/**
 * @title PodRegistry
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
contract PodRegistry is IPodRegistry, Ownable {
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

    /**
     * @notice Number of snapshots to check when finding the closest snapshot to a given timestamp before
     * falling back to binary search.
     */
    uint256 constant CHECK_COUNT = 3;

    /**
     * @notice Array of historical snapshots for time-based verification
     */
    Snapshot[] public history;

    /**
     * @notice Mapping from validator address to their 1-based index
     */
    mapping(address => uint8) public validatorIndex;

    /**
     * @notice Array of validators in the registry. We also use `validators.length + 1` to track the 1-based
     * index of the next validator to add.
     */
    address[] public validators;

    /**
     * @notice Bitmap of the currently active validators
     */
    uint256 public activeValidatorBitmap;

    /**
     * @notice Bitmap of the currently banned validators
     */
    uint256 public bannedValidatorBitmap;

    /**
     * @notice Initialize the registry with a set of initial validators. Only creates one snapshot
     * after adding all the initial validators.
     * @param initialValidators Array of validator addresses to initialize with
     * @dev The contract owner will be set to msg.sender
     */
    constructor(address[] memory initialValidators) Ownable(msg.sender) {
        for (uint8 i = 0; i < initialValidators.length; i++) {
            _addValidator(initialValidators[i]);
            activeValidatorBitmap |= (1 << i);
        }

        _createSnapshot();
    }

    /**
     * @notice Add a validator to the registry
     * @param validator The address of the validator to add
     * @dev Internal function called by addValidator
     */
    function _addValidator(address validator) internal {
        if (validator == address(0)) {
            revert ValidatorIsZeroAddress();
        }
        if (validatorIndex[validator] != 0) {
            revert ValidatorAlreadyExists();
        }
        if (validators.length >= MAX_VALIDATOR_COUNT) {
            revert MaxValidatorCountReached();
        }

        validators.push(validator);
        validatorIndex[validator] = uint8(validators.length);
    }

    /**
     * @inheritdoc IPodRegistry
     */
    function addValidator(address validator) external onlyOwner {
        _addValidator(validator);

        uint8 index = uint8(validators.length);
        _activateValidator(index);

        emit ValidatorAdded(validator);
    }

    /**
     * @inheritdoc IPodRegistry
     */
    function banValidator(address validator) external onlyOwner {
        uint8 index = validatorIndex[validator];
        if (index == 0) {
            revert ValidatorDoesNotExist();
        }
        if (_isValidatorBanned(index)) {
            revert CallerBanned();
        }
        if (_isValidatorActive(index)) {
            _deactivateValidator(index);
        }

        bannedValidatorBitmap = _setBit(bannedValidatorBitmap, index - 1);
        emit ValidatorBanned(validator);
    }

    /**
     * @inheritdoc IPodRegistry
     */
    function unbanValidator(address validator) external onlyOwner {
        uint8 index = validatorIndex[validator];
        if (index == 0) {
            revert ValidatorDoesNotExist();
        }
        if (!_isValidatorBanned(index)) {
            revert ValidatorNotBanned();
        }

        bannedValidatorBitmap = _clearBit(bannedValidatorBitmap, index - 1);
        emit ValidatorUnbanned(validator);
    }

    /**
     * @inheritdoc IPodRegistry
     */
    function deactivate() external {
        uint8 index = validatorIndex[msg.sender];
        if (index == 0) {
            revert CallerNotValidator();
        }
        if (!_isValidatorActive(index)) {
            revert CallerAlreadyInactive();
        }

        _deactivateValidator(index);
        emit ValidatorDeactivated(msg.sender);
    }

    /**
     * @inheritdoc IPodRegistry
     */
    function reactivate() external {
        uint8 index = validatorIndex[msg.sender];
        if (index == 0) {
            revert CallerNotValidator();
        }
        if (_isValidatorBanned(index)) {
            revert CallerBanned();
        }
        if (_isValidatorActive(index)) {
            revert CallerAlreadyActive();
        }

        _activateValidator(index);
        emit ValidatorReactivated(msg.sender);
    }

    /**
     * @notice Create a new snapshot at the current timestamp of the current validator set
     * @dev Internal function called whenever the validator set changes
     */
    function _createSnapshot() internal {
        uint8 count = _popCount(activeValidatorBitmap);
        history.push(
            Snapshot({activeAsOfTimestamp: block.timestamp, bitmap: activeValidatorBitmap, validatorCount: count})
        );
        emit SnapshotCreated(block.timestamp, activeValidatorBitmap);
    }

    /**
     * @inheritdoc IPodRegistry
     */
    function computeWeight(address[] memory subset) public view returns (uint256 weight) {
        if (history.length == 0) {
            return 0;
        }

        return computeWeight(subset, block.timestamp, history.length - 1);
    }

    /**
     * @inheritdoc IPodRegistry
     */
    function computeWeight(address[] memory subset, uint256 timestamp, uint256 snapshotIndex)
        public
        view
        returns (uint256 weight)
    {
        if (snapshotIndex >= history.length) {
            revert InvalidSnapshotIndex();
        }
        Snapshot memory snapshot = history[snapshotIndex];
        if (snapshot.activeAsOfTimestamp > timestamp) {
            revert SnapshotTooNew();
        }
        if (snapshotIndex != history.length - 1 && history[snapshotIndex + 1].activeAsOfTimestamp <= timestamp) {
            revert SnapshotTooOld();
        }

        uint256 counted = 0;
        for (uint256 i = 0; i < subset.length; i++) {
            uint8 index = validatorIndex[subset[i]];
            if (index == 0) {
                continue;
            }
            index = index - 1;

            if (_isBitSet(snapshot.bitmap, index) && !_isBitSet(counted, index)) {
                counted = _setBit(counted, index);
                weight++;
            }
        }
    }

    /**
     * @inheritdoc IPodRegistry
     */
    function findSnapshotIndex(uint256 timestamp) public view returns (uint256 snapshotIndex) {
        if (history.length == 0) {
            revert NoHistoricalSnapshots();
        }

        for (uint256 i = 0; i < CHECK_COUNT; i++) {
            if (i >= history.length) {
                break;
            }

            uint256 idx = history.length - 1 - i;
            if (history[idx].activeAsOfTimestamp <= timestamp) {
                return idx;
            }
        }

        uint256 low = 0;
        uint256 high = history.length - 1;

        while (low < high) {
            uint256 mid = (low + high + 1) / 2;
            if (history[mid].activeAsOfTimestamp <= timestamp) {
                low = mid;
            } else {
                high = mid - 1;
            }
        }

        return low;
    }

    /**
     * @inheritdoc IPodRegistry
     */
    function getActiveValidatorCount() public view returns (uint8 count) {
        // TODO: calculate count when updating the bitmap instead of counting on demand
        return _popCount(activeValidatorBitmap);
    }

    /**
     * @inheritdoc IPodRegistry
     */
    function getValidatorCountAtIndex(uint256 snapshotIndex) public view returns (uint8 count) {
        return history[snapshotIndex].validatorCount;
    }

    /**
     * @inheritdoc IPodRegistry
     */
    function getValidatorsAtIndex(uint256 snapshotIndex) public view returns (address[] memory) {
        uint256 bitmap = history[snapshotIndex].bitmap;
        uint8 count = history[snapshotIndex].validatorCount;
        address[] memory subset = new address[](count);
        uint8 j = 0;
        for (uint8 i = 0; i < validators.length; i++) {
            if (_isBitSet(bitmap, i)) {
                subset[j++] = validators[i];
            }
        }
        return subset;
    }

    /**
     * @inheritdoc IPodRegistry
     */
    function getActiveValidators() external view returns (address[] memory) {
        if (history.length == 0) {
            return new address[](0);
        }

        return getValidatorsAtIndex(history.length - 1);
    }

    /**
     * @inheritdoc IPodRegistry
     */
    function getActiveValidatorsAtTimestamp(uint256 timestamp) external view returns (address[] memory) {
        if (history.length == 0) {
            return new address[](0);
        }

        uint256 snapshotIndex = findSnapshotIndex(timestamp);
        return getValidatorsAtIndex(snapshotIndex);
    }

    /**
     * @inheritdoc IPodRegistry
     */
    function isValidatorBanned(address validator) external view returns (bool isBanned) {
        uint8 index = validatorIndex[validator];
        if (index == 0) {
            return false;
        }
        return _isValidatorBanned(index);
    }

    /**
     * @inheritdoc IPodRegistry
     */
    function getSnapshotAtIndex(uint256 snapshotIndex)
        external
        view
        returns (uint256 activeAsOfTimestamp, uint256 bitmap)
    {
        Snapshot memory s = history[snapshotIndex];
        return (s.activeAsOfTimestamp, s.bitmap);
    }

    /**
     * @inheritdoc IPodRegistry
     */
    function validatorCount() external view returns (uint8 count) {
        return uint8(validators.length);
    }

    /**
     * @inheritdoc IPodRegistry
     */
    function getHistoryLength() external view returns (uint256) {
        return history.length;
    }

    /**
     * @notice Activate a validator by setting their bit in the active bitmap
     * @param index The 1-based index of the validator to activate
     * @dev Creates a new snapshot after activation
     */
    function _activateValidator(uint8 index) internal {
        activeValidatorBitmap = _setBit(activeValidatorBitmap, index - 1);
        _createSnapshot();
    }

    /**
     * @notice Deactivate a validator by clearing their bit in the active bitmap
     * @param index The 1-based index of the validator to deactivate
     * @dev Creates a new snapshot after deactivation
     */
    function _deactivateValidator(uint8 index) internal {
        activeValidatorBitmap = _clearBit(activeValidatorBitmap, index - 1);
        _createSnapshot();
    }

    /**
     * @notice Check if a validator is currently active
     * @param index The 1-based index of the validator to check
     * @return True if the validator is active, false otherwise
     */
    function _isValidatorActive(uint8 index) internal view returns (bool) {
        return _isBitSet(activeValidatorBitmap, index - 1);
    }

    /**
     * @notice Check if a validator is currently banned
     * @param index The 1-based index of the validator to check
     * @return True if the validator is banned, false otherwise
     */
    function _isValidatorBanned(uint8 index) internal view returns (bool) {
        return _isBitSet(bannedValidatorBitmap, index - 1);
    }

    /**
     * @notice Check if a specific bit is set in a bitmap
     * @param bitmap The bitmap to check
     * @param i The 0-based bit position to check
     * @return True if the bit is set, false otherwise
     */
    function _isBitSet(uint256 bitmap, uint8 i) internal pure returns (bool) {
        return (bitmap & (1 << i)) != 0;
    }

    /**
     * @notice Set a specific bit in a bitmap
     * @param bitmap The bitmap to set the bit in
     * @param i The 0-based bit position to set
     * @return The bitmap with the bit set
     */
    function _setBit(uint256 bitmap, uint8 i) internal pure returns (uint256) {
        return bitmap | (1 << i);
    }

    /**
     * @notice Clear a specific bit in a bitmap
     * @param bitmap The bitmap to clear the bit in
     * @param i The 0-based bit position to clear
     * @return The bitmap with the bit cleared
     */
    function _clearBit(uint256 bitmap, uint8 i) internal pure returns (uint256) {
        return bitmap & ~(1 << i);
    }

    /**
     * @notice Count the number of set bits in a bitmap (pop count)
     * @param bitmap The bitmap to count set bits in
     * @return count The number of set bits
     * @dev Efficient implementation using Brian Kernighan's algorithm
     */
    function _popCount(uint256 bitmap) internal pure returns (uint8 count) {
        while (bitmap != 0) {
            count++;
            bitmap &= bitmap - 1;
        }
    }
}
