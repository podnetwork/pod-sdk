pragma solidity ^0.8.25;

import {requireQuorum} from "./Quorum.sol";

library FastTypes {
    struct SharedCounter {
        uint256 _value;
    }

    function increment(SharedCounter storage c, uint256 value) public {
        c._value += value;
    }

    function requireGte(SharedCounter storage c, uint256 value, string memory errorMessage) public view {
        requireQuorum(c._value >= value, errorMessage);
    }

    struct SharedCounters {
        mapping(bytes32 => SharedCounter) _counters;
    }

    function increment(SharedCounters storage c, bytes32 key, uint256 value) public {
        increment(c._counters[key], value);
    }

    function requireGte(SharedCounters storage c, bytes32 key, uint256 value, string memory errorMessage) public view {
        requireGte(c._counters[key], value, errorMessage);
    }

    struct OwnedCounter {
        mapping(address => int256) _values;
    }

    function requireGte(OwnedCounter storage c, address owner, uint256 value, string memory errorMessage) public view {
        requireQuorum(c._values[owner] >= int256(value), errorMessage);
    }

    function increment(OwnedCounter storage c, address owner, uint256 value) public {
        c._values[owner] += int256(value);
    }

    function decrement(OwnedCounter storage c, address owner, uint256 value) public {
        requireGte(c, owner, value, "Cannot decrement counter below 0");
        c._values[owner] -= int256(value);
    }

    struct OwnedBytes32 {
        bytes32 _value;
        address _owner;
    }

    function set(OwnedBytes32 storage o, bytes32 value) internal {
        require(o._owner == tx.origin, "Cannot access OwnedBytes32 owned by another address");
        o._value = value;
    }

    function get(OwnedBytes32 storage o) internal view returns (bytes32) {
        require(o._owner == tx.origin, "Cannot access OwnedBytes32 owned by another address");
        return o._value;
    }

    struct OwnedUint256 {
        uint256 _value;
        address _owner;
    }

    function set(OwnedUint256 storage o, uint256 value) internal {
        require(o._owner == tx.origin, "Cannot access OwnedUint256 owned by another address");
        o._value = value;
    }

    function get(OwnedUint256 storage o) internal view returns (uint256) {
        require(o._owner == tx.origin, "Cannot access OwnedUint256 owned by another address");
        return o._value;
    }

    function add(OwnedUint256 storage o, uint256 value) internal {
        require(o._owner == tx.origin, "Cannot access OwnedUint256 owned by another address");
        o._value += value;
    }

    function sub(OwnedUint256 storage o, uint256 value) internal {
        require(o._owner == tx.origin, "Cannot access OwnedUint256 owned by another address");
        require(o._value >= value, "Cannot subtract more than owned");
        o._value -= value;
    }

    struct OwnedUint256Map {
        mapping(bytes32 => OwnedUint256) _values;
    }

    function set(OwnedUint256Map storage m, bytes32 key, uint256 value) public {
        set(m._values[key], value);
    }

    function get(OwnedUint256Map storage m, bytes32 key) public view returns (uint256) {
        get(m._values[key]);
    }

    function add(OwnedUint256Map storage m, bytes32 key, uint256 value) public {
        add(m._values[key], value);
    }

    function sub(OwnedUint256Map storage m, bytes32 key, uint256 value) public {
        sub(m._values[key], value);
    }

    struct OwnedCounters {
        mapping(address => OwnedCounter) _counters;
    }

    function increment(OwnedCounters storage c, address owner, uint256 value) public {
        increment(c._counters[owner], value);
    }

    function decrement(OwnedCounters storage c, address owner, uint256 value) public {
        require(c._counters[owner].owner == tx.origin, "Cannot decrement counter owned by another address");
        requireGte(c._counters[owner], value, "Cannot decrement counter below 0");
        decrement(c._counters[owner], value);
    }

    function requireGte(OwnedCounters storage c, address owner, uint256 value, string memory errorMessage) public view {
        requireGte(c._counters[owner], value, errorMessage);
    }

    struct Token {
        OwnedCounters _balance;
    }

    function requireHasBalance(Token storage t, address owner, uint256 value, string memory errorMessage) public view {
        require(owner == tx.origin, "Cannot check balance of another address");
        requireGte(t._balance, owner, value, errorMessage);
    }

    function transfer(Token storage t, address from, address to, uint256 value) public {
        require(from == tx.origin, "Cannot transfer from another address");
        requireHasBalance(t, from, value, "Cannot transfer something not owned");
        increment(t._balance, to, value);
        decrement(t._balance, from, value);
    }

    struct Transferable {
        Token _balance;
    }

    function requireIsOwner(Transferable storage t, address owner, string memory errorMessage) public view returns (bool) {
        requireHasBalance(t._balance, owner, 1, errorMessage);
    }

    function transfer(Transferable storage t, address from, address to) public {
        require(from == tx.origin, "Cannot transfer from another address");
        requireIsOwner(t, from, "Cannot transfer something not owned");
        transfer(t._balance, from, to, 1);
    }

    struct Set {
        mapping(bytes32 => uint256) _index;
        uint256 _length;
    }

    function add(Set storage s, bytes32 value) public {
        if (s._index[value] == 0) {
            s._index[value] = s._length + 1;
            s._length++;
        }
    }

    function requireExists(Set storage s, bytes32 value, string memory errorMessage) public view {
        requireQuorum(s._index[value] > 0, errorMessage);
    }

    function requireLengthGte(Set storage s, uint256 value, string memory errorMessage) public view {
        requireQuorum(s._length >= value, errorMessage);
    }

    struct Uint256Set {
        Set _set;
        uint256 _maxValue;
    }

    function add(Uint256Set storage s, uint256 value) public {
        if (value > s._maxValue) {
            s._maxValue = value;
        }

        add(s._set, bytes32(value));
    }

    function requireExists(Uint256Set storage s, uint256 value, string memory errorMessage) public view {
        requireExists(s._set, bytes32(value), errorMessage);
    }

    function requireLengthGte(Uint256Set storage s, uint256 value, string memory errorMessage) public view {
        requireLengthGte(s._set, value, errorMessage);
    }

    function requireMaxValueGte(Uint256Set storage s, uint256 value, string memory errorMessage) public view {
        requireQuorum(s._maxValue >= value, errorMessage);
    }
}