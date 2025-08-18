// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title IPodRegistry
 * @notice Interface for the Pod Registry contract that manages the validator committee and committee rotation.
 * @dev This interface defines the core functionality for committee rotation. It is responsible
 *  for adding, banning, unbanning, activating and deactivating validators. It also provides
 *  ways to compute the weight of a subset of validators at a specific timestamp.
 *  In order to allow this, snapshots are created whenever the validator set changes.
 */
interface IPodRegistry {
    /**
     * @notice Represents a snapshot of the validator set at a specific timestamp
     * @param activeAsOfTimestamp The timestamp when this snapshot was created
     * @param bitmap Bitmap representing which validators were active at this snapshot
     */
    struct Snapshot {
        uint256 activeAsOfTimestamp;
        uint256 bitmap;
    }

    /// @notice Error thrown when too many initial validators are provided
    error TooManyInitialValidators();

    /// @notice Error thrown when a validator is a zero address
    error ValidatorIsZeroAddress();

    /// @notice Error thrown when a validator already exists
    error ValidatorAlreadyExists();

    /// @notice Error thrown when the maximum validator count is reached
    error MaxValidatorCountReached();

    /// @notice Error thrown when a validator does not exist
    error ValidatorDoesNotExist();

    /// @notice Error thrown when a validator is already banned
    error ValidatorAlreadyBanned();

    /// @notice Error thrown when a validator is not banned
    error ValidatorNotBanned();

    /// @notice Error thrown when the caller is not a validator
    error CallerNotValidator();

    /// @notice Error thrown when the caller is already inactive
    error CallerAlreadyInactive();

    /// @notice Error thrown when the caller is already banned
    error CallerAlreadyBanned();

    /// @notice Error thrown when the caller is already active
    error CallerAlreadyActive();

    /// @notice Error thrown when the snapshot index is invalid
    error InvalidSnapshotIndex();

    /// @notice Error thrown when the snapshot is too new
    error SnapshotTooNew();

    /// @notice Error thrown when the snapshot is too old
    error SnapshotTooOld();

    /// @notice Error thrown when there are no historical snapshots
    error NoHistoricalSnapshots();

    /// @notice Event emitted when a validator is added
    event ValidatorAdded(address indexed validator);

    /// @notice Event emitted when a validator is banned
    event ValidatorBanned(address indexed validator);

    /// @notice Event emitted when a validator is unbanned
    event ValidatorUnbanned(address indexed validator);

    /// @notice Event emitted when a validator is deactivated
    event ValidatorDeactivated(address indexed validator);

    /// @notice Event emitted when a validator is reactivated
    event ValidatorReactivated(address indexed validator);

    /// @notice Event emitted when a snapshot is created
    event SnapshotCreated(uint256 indexed activeAsOfTimestamp, uint256 bitmap);

    /**
     * @notice Get the index of a validator in the registry
     * @param validator The address of the validator
     * @return index The 1-based index of the validator (0 if not found)
     */
    function validatorIndex(address validator) external view returns (uint8 index);

    /**
     * @notice Check if a validator is banned
     * @param validator The address of the validator
     * @return isBanned True if the validator is banned, false otherwise
     */
    function isValidatorBanned(address validator) external view returns (bool isBanned);

    /**
     * @notice Get the total number of validators in the registry. Counts banned and active validators too.
     * @return count The total count of validators
     */
    function validatorCount() external view returns (uint8 count);

    /**
     * @notice Get the current bitmap of active validators
     * @return bitmap The bitmap representing which validators are currently active
     */
    function activeValidatorBitmap() external view returns (uint256 bitmap);

    /**
     * @notice Add a new validator to the registry and activates them. Modifies the current validator set
     *  therefore creates a new snapshot.
     * @param validator The address of the validator to add
     * @dev Only callable by the contract owner
     */
    function addValidator(address validator) external;

    /**
     * @notice Ban a validator from the registry
     *  if they are active, they are deactivated first. Modifies the current validator set
     *  therefore creates a new snapshot.
     * @param validator The address of the validator to ban
     * @dev Only callable by the contract owner
     */
    function banValidator(address validator) external;

    /**
     * @notice Unban a previously banned validator. Does not automatically reactivate the validator.
     *  So it does not modify the current validator set.
     * @param validator The address of the validator to unban
     * @dev Only callable by the contract owner
     */
    function unbanValidator(address validator) external;

    /**
     * @notice Deactivate the caller's validator status. Modifies the current validator set
     *  therefore creates a new snapshot.
     * @dev Only callable by registered validators
     */
    function deactivate() external;

    /**
     * @notice Reactivate the caller's validator status. Modifies the current validator set
     *  therefore creates a new snapshot.
     * @dev Only callable by registered validators who are not banned
     */
    function reactivate() external;

    /**
     * @notice Compute the weight of a subset of validators at the current time
     * @param subset Array of validator addresses to compute weight for
     * @return weight The computed weight (count of unique active validators in the subset)
     * @dev Uses the most recent snapshot for computation
     */
    function computeWeight(address[] memory subset) external view returns (uint256 weight);

    /**
     * @notice Compute the weight of a subset of validators at a specific historical point
     * @param subset Array of validator addresses to compute weight for
     * @param timestamp The timestamp to compute weight at
     * @param snapshotIndex The snapshot index to use for computation
     * @return weight The computed weight at the specified historical point
     * @dev Validates that the snapshot is appropriate for the given timestamp
     */
    function computeWeight(address[] memory subset, uint256 timestamp, uint256 snapshotIndex)
        external
        view
        returns (uint256 weight);

    /**
     * @notice Find the appropriate snapshot index for a given timestamp
     * Since this is a view function, it can be called off-chain to compute the correct snapshotIndex
     * corresponding to a particular timestamp.
     * Then, the function computeWeight can be called on-chain with the correct snapshotIndex.
     * @param timestamp The timestamp to find a snapshot for
     * @return snapshotIndex The index of the most recent snapshot at or before the timestamp
     * @dev Uses binary search for efficient lookup
     */
    function findSnapshotIndex(uint256 timestamp) external view returns (uint256 snapshotIndex);

    /**
     * @notice Get the count of currently active validators
     * @return count The number of active validators
     */
    function getActiveValidatorCount() external view returns (uint8 count);

    /**
     * @notice Get the count of validators at a specific snapshot
     * @param snapshotIndex The snapshot index to query
     * @return count The number of validators at the specified snapshot
     */
    function getValidatorCountAtIndex(uint256 snapshotIndex) external view returns (uint8 count);

    /**
     * @notice Get all currently active validators
     * @return Array of addresses of currently active validators
     */
    function getActiveValidators() external view returns (address[] memory);

    /**
     * @notice Get all validators that were active at a specific timestamp
     * @param timestamp The timestamp to query
     * @return Array of addresses of validators active at the specified timestamp
     */
    function getActiveValidatorsAtTimestamp(uint256 timestamp) external view returns (address[] memory);

    /**
     * @notice Get all validators at a specific snapshot
     * @param snapshotIndex The snapshot index to query
     * @return Array of addresses of validators at the specified snapshot
     */
    function getValidatorsAtIndex(uint256 snapshotIndex) external view returns (address[] memory);

    /**
     * @notice Get snapshot details at a specific index
     * @param snapshotIndex The snapshot index to query
     * @return activeAsOfTimestamp The timestamp when the snapshot was created
     * @return bitmap The bitmap of active validators at this snapshot
     */
    function getSnapshotAtIndex(uint256 snapshotIndex)
        external
        view
        returns (uint256 activeAsOfTimestamp, uint256 bitmap);

    /**
     * @notice Get the total number of snapshots in the history
     * @return The length of the snapshot history
     */
    function getHistoryLength() external view returns (uint256);
}

/**
 * @title PodRegistry
 * @notice Manages a dynamic set of validators with historical snapshots for quorum verification
 * @dev This contract maintains a bitmap-based validator set with the ability to create
 * historical snapshots for quorum verification of certificates signed by previously active committees.
 * It supports up to 255 validators
 * and uses bitmap operations for validator status tracking.
 *
 * @custom:security This contract is Ownable and should only be deployed with trusted ownership
 */
contract PodRegistry is IPodRegistry, Ownable {
    /// @notice Maximum number of validators allowed in the registry
    uint256 constant MAX_VALIDATOR_COUNT = 255;

    /// @notice Array of historical snapshots for time-based verification
    Snapshot[] public history;

    /// @notice Mapping from validator address to their 1-based index
    mapping(address => uint8) public validatorIndex;

    /**
     * @notice Array of validators in the registry. We also use `validators.length + 1` to track the 1-based
     * index of the next validator to add.
     */
    address[] public validators;

    /// @notice Bitmap of the currently active validators
    uint256 public activeValidatorBitmap;

    /// @notice Bitmap of the currently banned validators
    uint256 public bannedValidatorBitmap;

    /**
     * @notice Initialize the registry with a set of initial validators. Only creates one snapshot
     * after adding all the initial validators.
     * @param initialValidators Array of validator addresses to initialize with
     * @dev The contract owner will be set to msg.sender
     */
    constructor(address[] memory initialValidators) Ownable(msg.sender) {
        if (initialValidators.length >= MAX_VALIDATOR_COUNT) {
            revert TooManyInitialValidators();
        }

        for (uint8 i = 0; i < initialValidators.length; i++) {
            _addValidator(initialValidators[i], i + 1);
            activeValidatorBitmap |= (1 << i);
        }

        _createSnapshot();
    }

    /**
     * @notice Add a validator to the registry
     * @param validator The address of the validator to add
     * @param index The 1-based index of the validator
     * @dev Internal function called by addValidator
     */
    function _addValidator(address validator, uint8 index) internal {
        if (validator == address(0)) {
            revert ValidatorIsZeroAddress();
        }
        if (validatorIndex[validator] != 0) {
            revert ValidatorAlreadyExists();
        }

        validatorIndex[validator] = index;
        validators.push(validator);
    }

    /**
     * @inheritdoc IPodRegistry
     */
    function addValidator(address validator) external onlyOwner {
        if (validators.length >= MAX_VALIDATOR_COUNT) {
            revert MaxValidatorCountReached();
        }
        uint8 index = uint8(validators.length + 1);
        _addValidator(validator, index);
        if (!_isValidatorActive(index)) {
            _activateValidator(index);
        }
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
            revert ValidatorAlreadyBanned();
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
            revert CallerAlreadyBanned();
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
        history.push(Snapshot({activeAsOfTimestamp: block.timestamp, bitmap: activeValidatorBitmap}));
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

            if (_isBitSet(snapshot.bitmap, index - 1) && !_isBitSet(counted, index - 1)) {
                counted = _setBit(counted, index - 1);
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
        return _popCount(activeValidatorBitmap);
    }

    /**
     * @inheritdoc IPodRegistry
     */
    function getValidatorCountAtIndex(uint256 snapshotIndex) public view returns (uint8 count) {
        uint256 bitmap = history[snapshotIndex].bitmap;
        return _popCount(bitmap);
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

    /**
     * @inheritdoc IPodRegistry
     */
    function getValidatorsAtIndex(uint256 snapshotIndex) public view returns (address[] memory) {
        uint256 bitmap = history[snapshotIndex].bitmap;
        uint8 count = _popCount(bitmap);
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

    function _setBit(uint256 bitmap, uint8 i) internal pure returns (uint256) {
        return bitmap | (1 << i);
    }

    function _clearBit(uint256 bitmap, uint8 i) internal pure returns (uint256) {
        return bitmap & ~(1 << i);
    }
}
