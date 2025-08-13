// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IPodRegistry {
    struct Snapshot {
        uint256 activeAsOfBlockNumber;
        uint256 bitmap;
    }

    event ValidatorAdded(address indexed validator);
    event ValidatorBanned(address indexed validator);
    event ValidatorUnbanned(address indexed validator);
    event ValidatorDeactivated(address indexed validator);
    event ValidatorReactivated(address indexed validator);
    event SnapshotCreated(
        uint256 indexed activeAsOfBlockNumber,
        uint256 bitmap
    );

    function validatorIndex(
        address validator
    ) external view returns (uint8 index);
    function bannedValidators(
        address validator
    ) external view returns (bool isBanned);

    function validatorCount() external view returns (uint8 index);
    function activeValidatorBitmap() external view returns (uint256 bitmap);

    function addValidator(address validator) external;
    function banValidator(address validator) external;
    function unbanValidator(address validator) external;
    function deactivate() external;
    function reactivate() external;

    function computeWeight(
        address[] memory subset
    ) external view returns (uint256 weight);
    function computeWeight(
        address[] memory subset,
        uint256 blockNumber,
        uint256 snapshotIndex
    ) external view returns (uint256 weight);

    function findSnapshotIndex(
        uint256 blockNumber
    ) external view returns (uint256 index);

    function getActiveValidatorCount() external view returns (uint8 count);
    function getFaultTolerance() external view returns (uint8);
    function getSnapshot(
        uint256 index
    ) external view returns (uint256 activeAsOfBlockNumber, uint256 bitmap);
    function getHistoryLength() external view returns (uint256);
}

contract PodRegistry is IPodRegistry, Ownable {
    uint256 constant MAX_VALIDATOR_COUNT = 255;

    Snapshot[] public history;

    mapping(address => uint8) public validatorIndex;
    mapping(address => bool) public bannedValidators;

    uint256 public activeValidatorBitmap;
    uint8 public validatorCount;

    constructor(address[] memory initialValidators) Ownable(msg.sender) {
        for (uint8 i = 0; i < initialValidators.length; i++) {
            _addValidator(initialValidators[i]);
        }

        _createSnapshot();
    }

    function addValidator(address validator) external onlyOwner {
        _addValidator(validator);
        _createSnapshot();
    }

    function _addValidator(address validator) internal {
        require(validator != address(0), "pod: validator is the zero address");
        require(
            validatorIndex[validator] == 0,
            "pod: validator already exists"
        );
        require(
            validatorCount < MAX_VALIDATOR_COUNT,
            "pod: max validator count reached"
        );
        uint8 index = ++validatorCount;
        validatorIndex[validator] = index;
        _activateValidator(index);
        emit ValidatorAdded(validator);
    }

    function banValidator(address validator) external onlyOwner {
        _banValidator(validator);
        _createSnapshot();
    }

    function _banValidator(address validator) internal {
        uint8 index = validatorIndex[validator];
        require(index != 0, "pod: validator does not exist");
        require(
            !bannedValidators[validator],
            "pod: validator is already banned"
        );

        if (_isValidatorActive(index)) {
            _deactivateValidator(index);
        }

        bannedValidators[validator] = true;
        emit ValidatorBanned(validator);
    }

    function unbanValidator(address validator) external onlyOwner {
        require(
            validatorIndex[validator] != 0,
            "pod: validator does not exist"
        );
        require(bannedValidators[validator], "pod: validator is not banned");
        bannedValidators[validator] = false;
        emit ValidatorUnbanned(validator);
    }

    function deactivate() external {
        uint8 index = validatorIndex[msg.sender];
        require(index != 0, "pod: caller is not a validator");
        require(_isValidatorActive(index), "pod: caller is already inactive");
        _deactivateValidator(index);
        emit ValidatorDeactivated(msg.sender);
        _createSnapshot();
    }

    function reactivate() external {
        uint8 index = validatorIndex[msg.sender];
        require(index != 0, "pod: caller is not a validator");
        require(!bannedValidators[msg.sender], "pod: caller has been banned");
        require(!_isValidatorActive(index), "pod: caller is already active");
        _activateValidator(index);
        emit ValidatorReactivated(msg.sender);
        _createSnapshot();
    }

    function _createSnapshot() internal {
        history.push(
            Snapshot({
                activeAsOfBlockNumber: block.number,
                bitmap: activeValidatorBitmap
            })
        );
        emit SnapshotCreated(block.number, activeValidatorBitmap);
    }

    function computeWeight(
        address[] memory subset
    ) public view returns (uint256 weight) {
        if (history.length == 0) {
            return 0;
        }

        return computeWeight(subset, block.number, history.length - 1);
    }

    function computeWeight(
        address[] memory subset,
        uint256 blockNumber,
        uint256 snapshotIndex
    ) public view returns (uint256 weight) {
        require(snapshotIndex < history.length, "pod: invalid snapshot index");
        Snapshot memory snapshot = history[snapshotIndex];
        require(
            snapshot.activeAsOfBlockNumber <= blockNumber,
            "pod: snapshot too new"
        );
        require(
            snapshotIndex == history.length - 1 ||
                history[snapshotIndex + 1].activeAsOfBlockNumber > blockNumber,
            "pod: snapshot too old"
        );

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

    function findSnapshotIndex(
        uint256 blockNumber
    ) external view returns (uint256 index) {
        require(history.length > 0, "pod: no historical snapshots");

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
        count = 0;
        uint256 bitmap = activeValidatorBitmap;
        while (bitmap != 0) {
            count++;
            bitmap &= bitmap - 1;
        }
    }

    function getFaultTolerance() external view returns (uint8) {
        return getActiveValidatorCount() / 3;
    }

    function getSnapshot(
        uint256 index
    ) external view returns (uint256 activeAsOfBlockNumber, uint256 bitmap) {
        Snapshot memory s = history[index];
        return (s.activeAsOfBlockNumber, s.bitmap);
    }

    function getHistoryLength() external view returns (uint256) {
        return history.length;
    }

    function _activateValidator(uint8 index) internal {
        activeValidatorBitmap |= (1 << (index - 1));
    }

    function _deactivateValidator(uint8 index) internal {
        activeValidatorBitmap &= ~(1 << (index - 1));
    }

    function _isValidatorActive(uint8 index) internal view returns (bool) {
        return (activeValidatorBitmap & (1 << (index - 1))) != 0;
    }
}
