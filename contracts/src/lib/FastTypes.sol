pragma solidity ^0.8.25;

interface ICounter {
  function increment(bytes32 key, uint256 value) external; 
  function requireGte(bytes32 key, uint256 value) external view;
}

interface IOwned {
  function set(bytes32 key, bytes32 value) external; 
  function get(bytes32 key) external view returns (bytes32 value);
}

interface ISet {
  function insert(bytes32 key, bytes32 e) external; 
  function requireExist(bytes32 key, bytes32 e) external view;
}

interface IConstant {
  function create(bytes32 key, bytes32 value) external; 
  function requireGet(bytes32 key) external view returns (bytes32 value);
}

library FastTypes {
  address constant counterPrecompile = address(uint160(uint256(keccak256("pod-counter"))));

  struct Counter {
    bytes32 key;
  }

  function increment(Counter memory c, uint256 value) public {
    ICounter(counterPrecompile).increment(c.key, value);
  }

  function requireGte(Counter memory c, uint256 value) public view {
    ICounter(counterPrecompile).requireGte(c.key, value);
  }

  address constant ownedPrecompile = address(uint160(uint256(keccak256("pod-owned"))));

  struct Owned {
    bytes32 key;
    address owner;
  }

  modifier isOwner(Owned memory owned) {
    require(owned.owner == tx.origin, "Not the owner");
    _;
  }

  function set(Owned memory o, bytes32 value) public isOwner(o) {
    IOwned(ownedPrecompile).set(o.key, value);
  }

  function get(Owned memory o) public isOwner(o) view returns (bytes32) {
    return IOwned(ownedPrecompile).get(o.key);
  }

  address constant setPrecompile = address(uint160(uint256(keccak256("pod-set"))));

  struct Set {
    bytes32 key;
  }

  function insert(Set memory s, bytes32 value) public {
    ISet(setPrecompile).insert(s.key, value);
  }

  function requireExist(Set memory s, bytes32 value) view public {
    ISet(setPrecompile).requireExist(s.key, value);
  }

  address constant constantPrecompile = address(uint160(uint256(keccak256("pod-constant"))));

  struct Constant {
    bytes32 key;
  }

  function set(Constant memory c, bytes32 value) public {
    IConstant(constantPrecompile).create(c.key, value);
  }

  function requireGet(Constant memory c) public view returns (bytes32) {
    return IConstant(constantPrecompile).requireGet(c.key);
  }
}
