pragma solidity ^0.8.28;

address constant REQUIRE_QUORUM = address(uint160(uint256(keccak256("POD_REQUIRE_QUORUM"))));

function requireQuorum(bool input, string memory _message) view {
    REQUIRE_QUORUM.staticcall(abi.encode(input));
}