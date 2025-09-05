// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IBridgeDepositWithdraw} from "./interfaces/IBridgeDepositWithdraw.sol";
import {Bridge} from "./abstract/Bridge.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {PodECDSA} from "pod-sdk/verifier/PodECDSA.sol";
import {IPodRegistry} from "./interfaces/IPodRegistry.sol";

/**
 * @title BridgeDepositWithdraw
 * @notice Implementation of the deposit-withdraw bridge.
 * @dev This contract implements the IBridgeDepositWithdraw interface and provides the functionality for
 * depositing and withdrawing tokens between chains.
 */
contract BridgeDepositWithdraw is Bridge, IBridgeDepositWithdraw {
    using SafeERC20 for IERC20;

    /**
     * @dev The PodConfig for the bridge. The config defines the required number
     * of signatures to consider a certificate valid and the PodRegistry to use.
     */
    PodECDSA.PodConfig public podConfig;

    /**
     * @dev Constructor.
     * @param _podRegistry The address of the PodRegistry to use.
     */
    constructor(address _podRegistry) {
        podConfig =
            PodECDSA.PodConfig({thresholdNumerator: 2, thresholdDenominator: 3, registry: IPodRegistry(_podRegistry)});
    }

    /**
     * @dev Decodes the log into the deposit details.
     * @param log The log to decode.
     * @return id The id of the deposit.
     * @return token The token of the deposit.
     * @return amount The amount of the deposit.
     * @return to The address to send the tokens to.
     */
    function _decodeLog(PodECDSA.Log calldata log)
        internal
        pure
        returns (uint256 id, address token, uint256 amount, address to)
    {
        if (log.topics.length != 3 || log.topics[0] != DEPOSIT_TOPIC_0) revert InvalidDepositLog();
        id = uint256(log.topics[1]);
        token = address(uint160(uint256(log.topics[2])));
        (amount, to) = abi.decode(log.data, (uint256, address));
    }

    /**
     * @dev Handles the deposit of tokens. The tokens are transferred from the msg.sender to the contract.
     * @param token The token to deposit.
     * @param amount The amount of tokens to deposit.
     */
    function handleDeposit(address token, uint256 amount) internal override {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
    }

    /**
     * @dev Handles the migration of tokens. The tokens are transferred from the contract to the new contract.
     * @param _newContract The address of the new contract.
     */
    function handleMigrate(address _newContract) internal override {
        for (uint256 i = 0; i < whitelistedTokens.length; i++) {
            address token = whitelistedTokens[i];
            uint256 tokenBalance = IERC20(token).balanceOf(address(this));
            if (tokenBalance > 0) {
                IERC20(token).safeTransfer(_newContract, tokenBalance);
            }
        }
    }

    /**
     * @inheritdoc IBridgeDepositWithdraw
     */
    function claim(PodECDSA.CertifiedLog calldata certifiedLog) public override whenNotPaused {
        (uint256 id, address token, uint256 amount, address to) = _decodeLog(certifiedLog.log);
        address mirrorToken = mirrorTokens[token];
        if (mirrorToken == address(0)) revert MirrorTokenNotFound();

        if (!_isValidTokenAmount(mirrorToken, amount, false)) revert InvalidTokenAmount();

        bytes32 requestId = _hashRequest(id, token, amount, to);
        if (processedRequests[requestId]) revert RequestAlreadyProcessed();

        bool verified = PodECDSA.verifyCertifiedLog(podConfig, certifiedLog);
        if (!verified) revert InvalidCertificate();

        processedRequests[requestId] = true;

        IERC20(mirrorToken).safeTransfer(to, amount);
        emit Claim(id, mirrorToken, token, amount, to);
    }

    /**
     * @inheritdoc IBridgeDepositWithdraw
     */
    function whiteListToken(address token, address mirrorToken, TokenLimits calldata limits)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _whitelistToken(token, mirrorToken, limits);
    }
}
