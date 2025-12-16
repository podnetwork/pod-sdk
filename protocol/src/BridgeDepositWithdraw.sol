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
     * @dev Pre-computed hash of bridgeContract for merkle leaf construction.
     */
    bytes32 private immutable BRIDGE_CONTRACT_HASH;

    /**
     * @dev Constructor.
     * @param _podRegistry The address of the PodRegistry to use.
     * @param _bridgeContract The address of the bridge contract on the other chain.
     */
    constructor(address _podRegistry, address _bridgeContract) Bridge(_bridgeContract) {
        podConfig =
            PodECDSA.PodConfig({thresholdNumerator: 1, thresholdDenominator: 1, registry: IPodRegistry(_podRegistry)});
        BRIDGE_CONTRACT_HASH = keccak256(abi.encode(_bridgeContract));
    }

    /**
     * @dev Handles the deposit of tokens. The tokens are transferred from the msg.sender to the contract.
     * @dev Native deposits are not supported on this bridge.
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

    /// @dev Hashes a single bytes32 value using inline assembly (equivalent to keccak256(abi.encode(value)))
    function _hashBytes32(bytes32 value) internal pure returns (bytes32 result) {
        assembly {
            mstore(0x00, value)
            result := keccak256(0x00, 0x20)
        }
    }

    /// @dev Hashes deposit input: selector + token + amount + to (100 bytes) using inline assembly
    /// Equivalent to keccak256(abi.encodePacked(bytes4(keccak256("deposit(address,uint256,address)")), abi.encode(token, amount, to)))
    function _hashDepositInput(address token, uint256 amount, address to) internal pure returns (bytes32 result) {
        bytes4 selector = bytes4(keccak256("deposit(address,uint256,address)"));
        assembly {
            let ptr := mload(0x40)
            // Store selector in first 4 bytes
            mstore(ptr, selector)
            // Store token (32 bytes) starting at byte 4
            mstore(add(ptr, 0x04), token)
            // Store amount (32 bytes) starting at byte 36
            mstore(add(ptr, 0x24), amount)
            // Store to (32 bytes) starting at byte 68
            mstore(add(ptr, 0x44), to)
            result := keccak256(ptr, 0x64) // 100 bytes = 0x64
        }
    }

    /**
     * @inheritdoc IBridgeDepositWithdraw
     */
    function claim(
        address token,
        uint256 amount,
        address to,
        uint64 committeeEpoch,
        bytes calldata aggregatedSignatures,
        MerkleTree.MultiProof calldata proof
    ) public override whenNotPaused {
        address localToken = mirrorTokens[token];
        if (localToken == address(0)) revert MirrorTokenNotFound();
        checkValidClaim(localToken, amount);

        // Build leaves for validating merkle proof (no 'from' verification - anyone can claim)
        bytes32[] memory leaves = new bytes32[](2);
        leaves[0] = MerkleTree.hashLeaf("to", BRIDGE_CONTRACT_HASH);
        leaves[1] = MerkleTree.hashLeaf("input", _hashDepositInput(token, amount, to));

        sortLeaves(leaves);

        // Compute the merkle root from leaves and proof
        bytes32 txHash = MerkleTree.processMulti(leaves, proof);

        // Check if already processed
        if (processedRequests[txHash]) revert RequestAlreadyProcessed();

        // Reconstruct AttestedTx and verify signatures
        bytes32 attestedHash = AttestedTx.digest(txHash, committeeEpoch);
        bytes32 signedHash = _hashBytes32(attestedHash);
        address[] memory validators = ECDSA.recoverSigners(signedHash, aggregatedSignatures);

        uint256 weight = podConfig.registry.computeWeight(validators);

        uint256 threshold = Math.mulDiv(
            podConfig.registry.getValidatorCountAtIndex(committeeEpoch),
            podConfig.thresholdNumerator,
            podConfig.thresholdDenominator,
            Math.Rounding.Ceil
        );
        require(weight >= threshold, "Not enough validator weight");

        processedRequests[txHash] = true;

        IERC20(localToken).safeTransfer(to, amount);
        emit Claim(txHash, localToken, token, amount, to);
    }

    /**
     * @inheritdoc IBridgeDepositWithdraw
     * @param token Token that will be deposited in the contract (local/destination token).
     * @param mirrorToken Token that will be deposited in the mirror contract (source token).
     * @param limits Token limits associated with the token.
     */
    function whiteListToken(address token, address mirrorToken, TokenLimits calldata limits)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(token != address(0), "Token address cannot be zero");
        _whitelistToken(token, mirrorToken, limits);
    }
}
