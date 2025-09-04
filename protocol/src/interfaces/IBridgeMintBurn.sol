// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IBridge} from "./IBridge.sol";

interface IBridgeMintBurn is IBridge {
    function createAndWhitelistMirrorToken(
        string memory tokenName,
        string memory tokenSymbol,
        address existingToken,
        address mirrorToken,
        uint8 mirrorTokenDecimals,
        TokenLimits calldata limits
    ) external returns (address);

    error MultipleDepositsWithSameId();
    error NoDepositsFound();
    error PrecompileCallFailed();
}
