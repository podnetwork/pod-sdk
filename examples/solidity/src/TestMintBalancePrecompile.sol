pragma solidity ^0.8.26;

contract TestMintBalancePrecompile {
    address constant PRECOMPILE = address(uint160(uint256(keccak256("POD_MINT_BALANCE"))));

    function topUp(uint256 topUp) public {
        (bool success,) = PRECOMPILE.staticcall(abi.encode(topUp));
        require(success, "Precompile call failed");
    }
}
