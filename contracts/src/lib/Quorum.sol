pragma solidity ^0.8.28;

address constant REQUIRE_QUORUM = address(uint160(uint256(keccak256("POD_REQUIRE_QUORUM"))));

function requireQuorum(bool input, string memory message) view {
    (bool success, bytes memory _data) = REQUIRE_QUORUM.staticcall(abi.encode(input));
    // assumes the only way to fail is if the quorum is not met
    // in fact in production the contract call will revert before this require is even executed
    // and if the quorum is met it will always succeed
    // however this check is required for testing purposes
    require(success, message);
}
