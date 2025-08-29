// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPodRegistry
 * @notice Interface for the Pod Registry contract that manages the validator committee and committee rotation.
 * This is the source of truth for what the active pod validator set is at any given timestamp.
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

    /// @notice Error thrown when a validator is a zero address
    error ValidatorIsZeroAddress();

    /// @notice Error thrown when a validator already exists
    error ValidatorAlreadyExists();

    /// @notice Error thrown when the maximum validator count is reached
    error MaxValidatorCountReached();

    /// @notice Error thrown when a validator does not exist
    error ValidatorDoesNotExist();

    /// @notice Error thrown when a validator is not banned
    error ValidatorNotBanned();

    /// @notice Error thrown when the caller is not a validator
    error CallerNotValidator();

    /// @notice Error thrown when the caller is already inactive
    error CallerAlreadyInactive();

    /// @notice Error thrown when the caller is banned
    error CallerBanned();

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
     * @notice Get the total number of validators in the registry. Includes active, inactive, and banned validators.
     * @return count The total count of validators
     */
    function validatorCount() external view returns (uint8 count);

    /**
     * @notice Get the current bitmap of active validators
     * @return bitmap The bitmap representing which validators are currently active
     */
    function activeValidatorBitmap() external view returns (uint256 bitmap);

    /**
     * @notice Add a new validator to the registry and activate them. Modifies the current validator set
     *  therefore creates a new snapshot.
     * @param validator The address of the validator to add
     * @dev Only callable by the contract owner
     */
    function addValidator(address validator) external;

    /**
     * @notice Ban a validator from the registry.
     *  If they are active, they are deactivated first. Modifies the current validator set
     *  therefore creates a new snapshot.
     * @param validator The address of the validator to ban
     * @dev Only callable by the contract owner
     */
    function banValidator(address validator) external;

    /**
     * @notice Unban a previously banned validator. Does not automatically reactivate the validator.
     * Hence, it does not modify the current validator set, so no new snapshot is created.
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
     * @notice Compute the weight of a subset of currently active validators
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
     * The function also supports a fast path: scan the last few snapshots linearly before falling
     *  back to binary search. This is useful when we expect to validate recent certificates.
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
