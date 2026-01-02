// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SimpleStorage
 * @notice A simple storage contract for demonstrating pod SDK contract interactions
 */
contract SimpleStorage {
    /// @notice The stored value
    uint256 private _value;

    /// @notice The contract owner
    address public owner;

    /// @notice Emitted when the value is updated
    event ValueChanged(address indexed sender, uint256 oldValue, uint256 newValue);

    /// @notice Emitted when ownership is transferred
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /// @notice Error thrown when caller is not the owner
    error NotOwner(address caller, address owner);

    /// @notice Error thrown when value exceeds maximum
    error ValueTooLarge(uint256 value, uint256 maxValue);

    /// @notice Maximum allowed value
    uint256 public constant MAX_VALUE = 1_000_000;

    /// @notice Creates the contract and sets the deployer as owner
    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    /// @notice Modifier to restrict function to owner only
    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert NotOwner(msg.sender, owner);
        }
        _;
    }

    /**
     * @notice Get the current stored value
     * @return The current value
     */
    function get() external view returns (uint256) {
        return _value;
    }

    /**
     * @notice Set a new value (owner only)
     * @param newValue The new value to store
     */
    function set(uint256 newValue) external onlyOwner {
        if (newValue > MAX_VALUE) {
            revert ValueTooLarge(newValue, MAX_VALUE);
        }
        uint256 oldValue = _value;
        _value = newValue;
        emit ValueChanged(msg.sender, oldValue, newValue);
    }

    /**
     * @notice Increment the value by 1 (owner only)
     */
    function increment() external onlyOwner {
        uint256 oldValue = _value;
        uint256 newValue = oldValue + 1;
        if (newValue > MAX_VALUE) {
            revert ValueTooLarge(newValue, MAX_VALUE);
        }
        _value = newValue;
        emit ValueChanged(msg.sender, oldValue, newValue);
    }

    /**
     * @notice Transfer ownership to a new address
     * @param newOwner The address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}
