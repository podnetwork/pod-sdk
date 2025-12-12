// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IBridgeDepositWithdraw} from "pod-protocol/interfaces/IBridgeDepositWithdraw.sol";
import {Bridge} from "pod-protocol/abstract/Bridge.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {PodECDSA} from "pod-sdk/verifier/PodECDSA.sol";
import {ECDSA} from "pod-sdk/verifier/ECDSA.sol";
import {MerkleTree} from "pod-sdk/verifier/MerkleTree.sol";
import {IPodRegistry} from "pod-protocol/interfaces/IPodRegistry.sol";
import {AttestedTx} from "pod-protocol/libraries/AttestedTx.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

import "forge-std/console.sol";

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
     * @dev The index of the next deposit.
     */
    uint256 public depositIndex;

    /**
     * @dev Constructor.
     * @param _podRegistry The address of the PodRegistry to use.
     */
    constructor(address _podRegistry, address _bridgeContract, TokenLimits memory nativeTokenLimits)
        Bridge(_bridgeContract, nativeTokenLimits)
    {
        podConfig =
            PodECDSA.PodConfig({thresholdNumerator: 1, thresholdDenominator: 1, registry: IPodRegistry(_podRegistry)});
    }

    /**
     * @dev Decodes the log into the deposit details.
     * @param log The log to decode.
     * @return id The id of the deposit.
     * @return token The token of the deposit.
     * @return amount The amount of the deposit.
     * @return to The address to send the tokens to.
     */
    function _decodeDepositLog(PodECDSA.Log calldata log)
        internal
        pure
        returns (bytes32 id, address token, uint256 amount, address to)
    {
        if (log.topics[0] != DEPOSIT_TOPIC_0 || log.topics.length != 3) {
            revert InvalidDepositLog();
        }
        id = log.topics[1];
        token = address(uint160(uint256(log.topics[2])));
        (amount, to) = abi.decode(log.data, (uint256, address));
    }

    /**
     * @dev Decodes the log into native deposit details.
     * @param log The log to decode.
     * @return id The id of the deposit.
     * @return amount The amount of the deposit.
     * @return to The address to send the tokens to.
     */
    function _decodeDepositNativeLog(PodECDSA.Log calldata log)
        internal
        pure
        returns (bytes32 id, uint256 amount, address to)
    {
        if (log.topics[0] != DEPOSIT_NATIVE_TOPIC_0 || log.topics.length != 2) {
            revert InvalidDepositLog();
        }
        id = log.topics[1];
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
     * @dev Internal function to get the deposit ID.
     * @return id The request ID of the deposit.
     */
    function _getDepositId() internal override returns (bytes32) {
        return bytes32(depositIndex++);
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

    function sortLeaves(bytes32[] memory leaves) internal pure {
        uint256 n = leaves.length;
        for (uint256 i = 1; i < n; ++i) {
            bytes32 key = leaves[i];
            uint256 j = i;
            // Move elements of leaves[0..i-1] that are > key one position ahead
            while (j > 0 && leaves[j - 1] > key) {
                leaves[j] = leaves[j - 1];
                unchecked {
                    j--;
                }
            }
            leaves[j] = key;
        }
    }

    /**
     * @inheritdoc IBridgeDepositWithdraw
     */
    function claim(
        address token,
        uint256 amount,
        AttestedTx.AttestedTx calldata attested,
        bytes calldata aggregated_signatures,
        MerkleTree.MultiProof calldata proof
    ) public override whenNotPaused {
        address mirrorToken = mirrorTokens[token];
        if (mirrorToken == address(0)) revert MirrorTokenNotFound();

        if (!_isValidTokenAmount(mirrorToken, amount, false)) revert InvalidTokenAmount();

        console.log("claim called with amount: %s", amount);
        console.log("Merkle proof path:");
        for (uint256 i = 0; i < proof.path.length; i++) {
            console.logBytes32(proof.path[i]);
        }
        console.log("Merkle proof flags:");
        for (uint256 i = 0; i < proof.flags.length; i++) {
            console.logBool(proof.flags[i]);
        }

        // Build leaves for validating merkle proof
        bytes4 selector = bytes4(keccak256("deposit(address,uint256)"));
        bytes32[] memory leaves = new bytes32[](4);
        leaves[0] = MerkleTree.hashLeaf("from", keccak256(abi.encode(msg.sender)));
        leaves[1] = MerkleTree.hashLeaf("to", keccak256(abi.encode(bridgeContract)));
        leaves[2] = MerkleTree.hashLeaf("value", keccak256(abi.encode(0)));
        leaves[3] = MerkleTree.hashLeaf("input", keccak256(abi.encodePacked(selector, abi.encode(token, amount))));

        sortLeaves(leaves);

        console.log("leaves:");
        for (uint256 i = 0; i < leaves.length; i++) {
            console.logBytes32(leaves[i]);
        }

        bool valid = MerkleTree.verifyMulti(attested.hash, leaves, proof);
        require(valid, "Invalid Merkle proof");

        // Verify signatures
        bytes32 attested_hash = AttestedTx.digest(attested);
        bytes32 signed_hash = keccak256(abi.encode(attested_hash));
        console.log("Signed hash:");
        console.logBytes32(signed_hash);
        console.log("Aggregated signatures:");
        console.logBytes(aggregated_signatures);
        address[] memory validators = ECDSA.recoverSigners(signed_hash, aggregated_signatures);
        console.log("Recovered validators:");
        for (uint256 i = 0; i < validators.length; i++) {
            console.logAddress(validators[i]);
        }

        uint256 weight = podConfig.registry.computeWeight(validators);
        console.log("Computed weight:", weight);

        uint256 threshold = Math.mulDiv(
            podConfig.registry.getValidatorCountAtIndex(attested.committee_epoch),
            podConfig.thresholdNumerator,
            podConfig.thresholdDenominator,
            Math.Rounding.Ceil
        );
        console.log("Required threshold:", threshold);
        require(weight >= threshold, "Not enough validator weight");

        processedRequests[attested.hash] = true;

        IERC20(mirrorToken).safeTransfer(msg.sender, amount);
        emit Claim(attested.hash, mirrorToken, token, amount, msg.sender);
    }

    /**
     * @inheritdoc IBridgeDepositWithdraw
     */
    function claimNative(
        uint256 amount,
        AttestedTx.AttestedTx calldata attested,
        bytes calldata aggregated_signatures,
        MerkleTree.MultiProof calldata proof
    ) public override whenNotPaused {
        if (!_isValidTokenAmount(MOCK_ADDRESS_FOR_NATIVE_DEPOSIT, amount, false)) {
            revert InvalidTokenAmount();
        }

        console.log("claimNative called with amount: %s", amount);
        console.log("Merkle proof path:");
        for (uint256 i = 0; i < proof.path.length; i++) {
            console.logBytes32(proof.path[i]);
        }
        console.log("Merkle proof flags:");
        for (uint256 i = 0; i < proof.flags.length; i++) {
            console.logBool(proof.flags[i]);
        }

        // Build leaves for validating merkle proof
        bytes4 selector = bytes4(keccak256("depositNative()"));
        bytes32[] memory leaves = new bytes32[](4);
        leaves[0] = MerkleTree.hashLeaf("from", keccak256(abi.encode(msg.sender)));
        leaves[1] = MerkleTree.hashLeaf("to", keccak256(abi.encode(bridgeContract)));
        leaves[2] = MerkleTree.hashLeaf("value", keccak256(abi.encode(amount)));
        leaves[3] = MerkleTree.hashLeaf("input", keccak256(abi.encodePacked(selector)));

        sortLeaves(leaves);

        console.log("leaves:");
        for (uint256 i = 0; i < leaves.length; i++) {
            console.logBytes32(leaves[i]);
        }

        bool valid = MerkleTree.verifyMulti(attested.hash, leaves, proof);
        require(valid, "Invalid Merkle proof");

        // Verify signatures
        bytes32 attested_hash = AttestedTx.digest(attested);
        bytes32 signed_hash = keccak256(abi.encode(attested_hash));
        console.log("Signed hash:");
        console.logBytes32(signed_hash);
        console.log("Aggregated signatures:");
        console.logBytes(aggregated_signatures);
        address[] memory validators = ECDSA.recoverSigners(signed_hash, aggregated_signatures);
        console.log("Recovered validators:");
        for (uint256 i = 0; i < validators.length; i++) {
            console.logAddress(validators[i]);
        }

        uint256 weight = podConfig.registry.computeWeight(validators);
        console.log("Computed weight:", weight);

        uint256 threshold = Math.mulDiv(
            podConfig.registry.getValidatorCountAtIndex(attested.committee_epoch),
            podConfig.thresholdNumerator,
            podConfig.thresholdDenominator,
            Math.Rounding.Ceil
        );
        console.log("Required threshold:", threshold);
        require(weight >= threshold, "Not enough validator weight");

        processedRequests[attested.hash] = true;

        (bool sent,) = msg.sender.call{value: amount}("");
        require(sent, "Failed to transfer native tokens");
        emit ClaimNative(attested.hash, amount, msg.sender);
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
