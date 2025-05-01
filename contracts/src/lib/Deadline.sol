pragma solidity ^0.8.25;

interface IDeadline {
  function requireTimeLte(uint256 timestamp) external;
  function requireTimeGte(uint256 timestamp) external;
}

library Deadline {
  address constant deadlinePrecompile = address(uint160(uint256(keccak256("pod-deadline"))));

  function requireTimeGte(uint256 timestamp) public {
    IDeadline(deadlinePrecompile).requireTimeGte(timestamp);
  }

  function requireTimeLte(uint256 timestamp) public {
    IDeadline(deadlinePrecompile).requireTimeLte(timestamp);
  }
}
