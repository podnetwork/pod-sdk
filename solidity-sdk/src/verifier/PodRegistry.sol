// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IPodRegistry {
    struct Snapshot {
        uint256 activeAsOfBlockNumber;
        uint256 bitmap;
    }

    error TooManyInitialValidators();
    error ValidatorIsZeroAddress();
    error ValidatorAlreadyExists();
    error MaxValidatorCountReached();
    error ValidatorDoesNotExist();
    error ValidatorAlreadyBanned();
    error ValidatorNotBanned();
    error CallerNotValidator();
    error CallerAlreadyInactive();
    error CallerAlreadyBanned();
    error CallerAlreadyActive();
    error InvalidSnapshotIndex();
    error SnapshotTooNew();
    error SnapshotTooOld();
    error NoHistoricalSnapshots();

    event ValidatorAdded(address indexed validator);
    event ValidatorBanned(address indexed validator);
    event ValidatorUnbanned(address indexed validator);
    event ValidatorDeactivated(address indexed validator);
    event ValidatorReactivated(address indexed validator);
    event SnapshotCreated(uint256 indexed activeAsOfBlockNumber, uint256 bitmap);

    function validatorIndex(address validator) external view returns (uint8 index);
    function validatorAddress(uint8 index) external view returns (address validator);
    function bannedValidators(address validator) external view returns (bool isBanned);

    function validatorCount() external view returns (uint8 count);
    function activeValidatorBitmap() external view returns (uint256 bitmap);

    function addValidator(address validator) external;
    function banValidator(address validator) external;
    function unbanValidator(address validator) external;
    function deactivate() external;
    function reactivate() external;

    function computeWeight(address[] memory subset) external view returns (uint256 weight);
    function computeWeight(address[] memory subset, uint256 blockNumber, uint256 snapshotIndex)
        external
        view
        returns (uint256 weight);

    function findSnapshotIndex(uint256 blockNumber) external view returns (uint256 index);

    function getActiveValidatorCount() external view returns (uint8 count);
    function getValidatorCountAt(uint256 index) external view returns (uint8 count);
    function getActiveValidators() external view returns (address[] memory);
    function getValidatorsAt(uint256 index) external view returns (address[] memory);
    function getSnapshotAt(uint256 index) external view returns (uint256 activeAsOfBlockNumber, uint256 bitmap);
    function getHistoryLength() external view returns (uint256);
}

contract PodRegistry is IPodRegistry, Ownable {
    uint256 constant MAX_VALIDATOR_COUNT = 255;

    Snapshot[] public history;

    mapping(address => uint8) public validatorIndex;
    mapping(uint8 => address) public validatorAddress;
    mapping(address => bool) public bannedValidators;

    uint256 public activeValidatorBitmap;
    uint8 public validatorCount;

    constructor(address[] memory initialValidators) Ownable(msg.sender) {
        if (initialValidators.length >= MAX_VALIDATOR_COUNT) {
            revert TooManyInitialValidators();
        }
        validatorCount = uint8(initialValidators.length);

        for (uint8 i = 0; i < initialValidators.length; i++) {
            _addValidatorOnInit(initialValidators[i], i);
        }

        _createSnapshot();
    }

    function _addValidatorOnInit(address validator, uint8 index) internal {
        validatorIndex[validator] = index + 1;
        activeValidatorBitmap |= (1 << index);
        validatorAddress[index + 1] = validator;
    }

    function addValidator(address validator) external onlyOwner {
        if (validator == address(0)) {
            revert ValidatorIsZeroAddress();
        }
        if (validatorIndex[validator] != 0) {
            revert ValidatorAlreadyExists();
        }
        if (validatorCount >= MAX_VALIDATOR_COUNT) {
            revert MaxValidatorCountReached();
        }
        uint8 index = ++validatorCount;
        validatorIndex[validator] = index;
        validatorAddress[index] = validator;
        if (!_isValidatorActive(index)) {
            _activateValidator(index);
        }
        emit ValidatorAdded(validator);
    }

    function banValidator(address validator) external onlyOwner {
        uint8 index = validatorIndex[validator];
        if (index == 0) {
            revert ValidatorDoesNotExist();
        }
        if (bannedValidators[validator]) {
            revert ValidatorAlreadyBanned();
        }

        if (_isValidatorActive(index)) {
            _deactivateValidator(index);
        }

        bannedValidators[validator] = true;
        emit ValidatorBanned(validator);
    }

    function unbanValidator(address validator) external onlyOwner {
        if (validatorIndex[validator] == 0) {
            revert ValidatorDoesNotExist();
        }
        if (!bannedValidators[validator]) {
            revert ValidatorNotBanned();
        }
        bannedValidators[validator] = false;
        emit ValidatorUnbanned(validator);
    }

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

    function reactivate() external {
        uint8 index = validatorIndex[msg.sender];
        if (index == 0) {
            revert CallerNotValidator();
        }
        if (bannedValidators[msg.sender]) {
            revert CallerAlreadyBanned();
        }
        if (_isValidatorActive(index)) {
            revert CallerAlreadyActive();
        }
        _activateValidator(index);
        emit ValidatorReactivated(msg.sender);
    }

    function _createSnapshot() internal {
        history.push(Snapshot({activeAsOfBlockNumber: block.number, bitmap: activeValidatorBitmap}));
        emit SnapshotCreated(block.number, activeValidatorBitmap);
    }

    function computeWeight(address[] memory subset) public view returns (uint256 weight) {
        if (history.length == 0) {
            return 0;
        }

        return computeWeight(subset, block.number, history.length - 1);
    }

    function computeWeight(address[] memory subset, uint256 blockNumber, uint256 snapshotIndex)
        public
        view
        returns (uint256 weight)
    {
        if (snapshotIndex >= history.length) {
            revert InvalidSnapshotIndex();
        }
        Snapshot memory snapshot = history[snapshotIndex];
        if (snapshot.activeAsOfBlockNumber > blockNumber) {
            revert SnapshotTooNew();
        }
        if (snapshotIndex != history.length - 1 && history[snapshotIndex + 1].activeAsOfBlockNumber <= blockNumber) {
            revert SnapshotTooOld();
        }

        uint256 counted = 0;

        for (uint256 i = 0; i < subset.length; i++) {
            uint8 index = validatorIndex[subset[i]];

            if (index == 0) {
                continue;
            }

            uint256 mask = 1 << (index - 1);
            if ((snapshot.bitmap & mask) != 0 && (counted & mask) == 0) {
                counted |= mask;
                weight++;
            }
        }
    }

    function findSnapshotIndex(uint256 blockNumber) public view returns (uint256 index) {
        if (history.length == 0) {
            revert NoHistoricalSnapshots();
        }

        uint256 low = 0;
        uint256 high = history.length - 1;

        while (low < high) {
            uint256 mid = (low + high + 1) / 2;
            if (history[mid].activeAsOfBlockNumber <= blockNumber) {
                low = mid;
            } else {
                high = mid - 1;
            }
        }

        return low;
    }

    function getActiveValidatorCount() public view returns (uint8 count) {
        return _popCount(activeValidatorBitmap);
    }

    function getValidatorCountAt(uint256 index) public view returns (uint8 count) {
        uint256 bitmap = history[index].bitmap;
        return _popCount(bitmap);
    }

    function _popCount(uint256 bitmap) internal pure returns (uint8 count) {
        while (bitmap != 0) {
            count++;
            bitmap &= bitmap - 1;
        }
    }

    function getValidatorsAt(uint256 index) public view returns (address[] memory) {
        uint256 bitmap = history[index].bitmap;
        uint8 count = _popCount(bitmap);
        address[] memory validators = new address[](count);
        uint8 j = 0;
        for (uint8 i = 0; i < validatorCount; i++) {
            if (_isBitSet(bitmap, i)) {
                validators[j++] = validatorAddress[i + 1];
            }
        }
        return validators;
    }

    function getActiveValidators() external view returns (address[] memory) {
        return getValidatorsAt(history.length - 1);
    }

    function getSnapshotAt(uint256 index) external view returns (uint256 activeAsOfBlockNumber, uint256 bitmap) {
        Snapshot memory s = history[index];
        return (s.activeAsOfBlockNumber, s.bitmap);
    }

    function getHistoryLength() external view returns (uint256) {
        return history.length;
    }

    function _activateValidator(uint8 index) internal {
        activeValidatorBitmap |= (1 << (index - 1));
        _createSnapshot();
    }

    function _deactivateValidator(uint8 index) internal {
        activeValidatorBitmap &= ~(1 << (index - 1));
        _createSnapshot();
    }

    function _isValidatorActive(uint8 index) internal view returns (bool) {
        return _isBitSet(activeValidatorBitmap, index - 1);
    }

    function _isBitSet(uint256 bitmap, uint8 i) internal pure returns (bool) {
        return (bitmap & (1 << i)) != 0;
    }
}
