pragma solidity ^0.8.25;

import {requireQuorum} from "./Quorum.sol";

interface ISharedCounter {
    function increment(uint256 value) external;
    function requireGte(uint256 value, string memory errorMessage) external view;
}

interface IOwnedCounter {
    function requireGte(uint256 value, string memory errorMessage) external view;
    function increment(uint256 value) external;
    function decrement(uint256 value) external;
}

interface IOwnedBytes32 {
    function set(bytes32 value) external;
    function get() external view returns (bytes32);
}

interface IOwnedCounters {
    function increment(address owner, uint256 value) external;
    function decrement(address owner, uint256 value) external;
    function requireGte(address owner, uint256 value, string memory errorMessage) external view;
}

interface IToken {
    function requireHasBalance(address owner, uint256 value, string memory errorMessage) external view;
    function transfer(address from, address to, uint256 value) external;
}

interface ITransferable {
    function requireIsOwner(address owner, string memory errorMessage) external view returns (bool);
    function transfer(address from, address to) external;
}

interface ISet {
    function add(bytes32 value) external;
    function requireExist(bytes32 value, string memory errorMessage) external view;
    function requireLengthGte(uint256 value, string memory errorMessage) external view;
}

interface IUint256Set {
    function add(uint256 value) external;
    function requireExist(uint256 value, string memory errorMessage) external view;
    function requireLengthGte(uint256 value, string memory errorMessage) external view;
    function requireMaxValueGte(uint256 value, string memory errorMessage) external view;
}

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

    struct OwnedCounter {
        int256 _value;
        address owner;
    }

    function requireGte(OwnedCounter storage c, uint256 value, string memory errorMessage) public view {
        Counter.requireGte(c._value, value, errorMessage);
    }

    function increment(OwnedCounter storage c, uint256 value) public {
        c._values[owner] += value;
    }

    function decrement(OwnedCounter storage c, uint256 value) public {
        require(c.owner == tx.origin, "Cannot decrement counter owned by another address");
        requireGte(c, owner, value, "Cannot decrement counter below 0");
        c._value -= value;
    }

    struct OwnedBytes32 {
        bytes32 _value;
        address _owner;
    }

    function set(Owned storage o, bytes32 value) onlyOwner(owner) {
        require(o._owner == tx.origin, "Cannot access OwnedBytes32 owned by another address");
        o._value = value;
    }

    function get(Owned storage o) returns (bytes32) {
        require(o._owner == tx.origin, "Cannot access OwnedBytes32 owned by another address");
        return o._values[owner];
    }

    struct OwnedCounters {
        mapping(address => OwnedCounter) _counters;
    }

    function increment(OwnedCounters storage c, address owner, uint256 value) public {
        c._counters[owner].increment(value);
    }

    function decrement(OwnedCounters storage c, address owner, uint256 value) public {
        require(c._counters[owner].owner == tx.origin, "Cannot decrement counter owned by another address");
        requireGte(c._counters[owner], value, "Cannot decrement counter below 0");
        c._counters[owner].decrement(value);
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
        requireIsOwner(t, from, "Cannot transfer something not owned");
        increment(t._balance, to, value);
        decrement(t._balance, from, value);
    }

    struct Transferable {
        Token _balance;
    }

    function requireIsOwner(Transferable storage t, address owner, string storage errorMessage) public view returns (bool) {
        requireHasBalance(t._balance, owner, 1, errorMessage);
    }

    function transfer(Transferable storage t, address from, address to) public {
        require(from == tx.origin, "Cannot transfer from another address");
        requireIsOwner(t, from, "Cannot transfer something not owned");
        t._balance.transfer(from, to, 1);
    }

    struct Set {
        mapping(bytes32 => uint256) _index;
        Counter _length;
    }

    function add(Set storage s, bytes32 value) public {
        if (s._index[value] == 0) {
            s._index[value] = s._values.length;
            Counter.increment(s._length, 1);
        }
    }

    function requireExist(Set storage s, bytes32 value, string memory errorMessage) public view {
        requireQuorum(s._index[value] > 0, errorMessage);
    }

    function requireLengthGte(Set storage s, uint256 value, string memory errorMessage) public view {
        Counter.requireGte(s._length, value, errorMessage);
    }

    struct Uint256Set {
        Set _set;
        uint256 _maxValue;
    }

    function add(Uint256Set storage s, uint256 value) public {
        if (value > s._maxValue) {
            s._maxValue = value;
        }

        Set.add(s._set, value);
    }

    function requireExist(Uint256Set storage s, uint256 value, string memory errorMessage) public view {
        Set.requireExist(s._set, value, errorMessage);
    }

    function requireLengthGte(Uint256Set storage s, uint256 value, string memory errorMessage) public view {
        Set.requireLengthGte(s._set, value, errorMessage);
    }

    function requireMaxValueGte(Uint256Set storage s, uint256 value, string memory errorMessage) public view {
        requireQuorum(s._maxValue >= value, errorMessage);
    }
}