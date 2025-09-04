// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IBridge} from "./IBridge.sol";

interface IBridgeDepositWithdraw is IBridge {
    function whiteListToken(address token, address mirrorToken, TokenLimits calldata limits) external;

    error InvalidDepositLog();
    error InvalidCertificate();
}
