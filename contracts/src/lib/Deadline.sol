pragma solidity ^0.8.25;

import {requireQuorum} from "./Quorum.sol";

function requireTimeAfter(uint256 timestamp, string memory message) view {
	requireQuorum(block.timestamp > timestamp, message);
}

function requireTimeBefore(uint256 timestamp, string memory message) view {
	requireQuorum(block.timestamp < timestamp, message);
}
