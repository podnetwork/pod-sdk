pragma solidity ^0.8.25;

import {requireQuorum} from "./Quorum.sol";

library FastTypes {
    struct SharedCounter {
        mapping(bytes32 => uint256) _values;
    }

    function increment(SharedCounter storage c, bytes32 key, uint256 value) internal {
        c._values[key] += value;
    }

    function requireGte(SharedCounter storage c, bytes32 key, uint256 value, string memory errorMessage) internal view {
        requireQuorum(c._values[key] >= value, errorMessage);
    }

    struct OwnedCounter {
        mapping(bytes32 => mapping(address => uint256)) _values;
    }

    function get(OwnedCounter storage c, bytes32 key, address owner) internal view returns (uint256) {
        require(owner == tx.origin, "Cannot access OwnedCounter owned by another address");
        return c._values[key][owner];
    }

    function increment(OwnedCounter storage c, bytes32 key, address owner, uint256 value) internal {
        require(owner == tx.origin, "Cannot access OwnedCounter owned by another address");
        c._values[key][owner] += value;
    }

    function decrement(OwnedCounter storage c, bytes32 key, address owner, uint256 value) internal {
        require(owner == tx.origin, "Cannot access OwnedCounter owned by another address");
        require(c._values[key][owner] >= value, "Cannot decrement counter below 0");
        c._values[key][owner] -= value;
    }

    function set(OwnedCounter storage c, bytes32 key, address owner, uint256 value) internal {
        require(owner == tx.origin, "Cannot access OwnedCounter owned by another address");
        c._values[key][owner] = value;
    }

    struct Balance {
        mapping(bytes32 => mapping(address => int256)) _values;
    }

    function requireGte(Balance storage b, bytes32 key, address owner, uint256 value, string memory errorMessage)
        internal
        view
    {
        requireQuorum(b._values[key][owner] >= int256(value), errorMessage);
    }

    function increment(Balance storage b, bytes32 key, address owner, uint256 value) internal {
        b._values[key][owner] += int256(value);
    }

    function decrement(Balance storage b, bytes32 key, address owner, uint256 value) internal {
        requireGte(b, key, owner, value, "Cannot decrement balance below 0");
        b._values[key][owner] -= int256(value);
    }

    struct Set {
        mapping(bytes32 => uint256) _index;
        uint256 _length;
    }

    function add(Set storage s, bytes32 value) internal {
        if (s._index[value] == 0) {
            s._index[value] = s._length + 1;
            s._length++;
        }
    }

    function requireExists(Set storage s, bytes32 value, string memory errorMessage) internal view {
        requireQuorum(s._index[value] > 0, errorMessage);
    }

    function requireLengthGte(Set storage s, uint256 value, string memory errorMessage) internal view {
        requireQuorum(s._length >= value, errorMessage);
    }

    struct Uint256Set {
        Set _set;
        uint256 _maxValue;
    }

    function add(Uint256Set storage s, uint256 value) internal {
        if (value > s._maxValue) {
            s._maxValue = value;
        }

        add(s._set, bytes32(value));
    }

    function requireExists(Uint256Set storage s, uint256 value, string memory errorMessage) internal view {
        requireExists(s._set, bytes32(value), errorMessage);
    }

    function requireLengthGte(Uint256Set storage s, uint256 value, string memory errorMessage) internal view {
        requireLengthGte(s._set, value, errorMessage);
    }

    function requireMaxValueGte(Uint256Set storage s, uint256 value, string memory errorMessage) internal view {
        requireQuorum(s._maxValue >= value, errorMessage);
    }

    struct AddressSet {
        Set _set;
    }

    function add(AddressSet storage s, address value) internal {
        add(s._set, bytes32(uint256(uint160(value))));
    }

    function requireExists(AddressSet storage s, address value, string memory errorMessage) internal view {
        requireExists(s._set, bytes32(uint256(uint160(value))), errorMessage);
    }

    function requireLengthGte(AddressSet storage s, uint256 value, string memory errorMessage) internal view {
        requireLengthGte(s._set, value, errorMessage);
    }
}
