pragma solidity ^0.8.26;

contract TestMintBalancePrecompile {
    address constant PRECOMPILE = address(uint160(uint256(keccak256("POD_MINT_BALANCE"))));

    function mint(uint256 value) public view {
        (bool success,) = PRECOMPILE.staticcall(abi.encode(value));
        require(success, "Precompile call failed");
    }
}
