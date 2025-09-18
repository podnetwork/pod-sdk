// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

library PodMintBalance {
    /**
     * @dev The address of the external pod mint balance precompile.
     */
    address constant PRECOMPILE_ADDRESS = address(uint160(uint256(keccak256("POD_MINT_BALANCE"))));

    /**
     * @dev Mints tokens to the caller.
     * @param amount The amount of tokens to mint.
     * @return success Whether the minting was successful.
     */
    function mint(uint256 amount) external view returns (bool) {
        (bool success,) = PRECOMPILE_ADDRESS.staticcall(abi.encode(amount));
        return success;
    }
}
