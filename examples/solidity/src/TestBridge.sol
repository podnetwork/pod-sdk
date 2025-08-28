pragma solidity ^0.8.26;

contract TestBridge {
    address constant BRIDGE = address(uint160(uint256(keccak256("POD_BRIDGE"))));

    function topUp(uint256 topUp) public {
        (bool success,) = BRIDGE.staticcall(abi.encode(topUp));
        require(success, "Precompile call failed");
    }
}
