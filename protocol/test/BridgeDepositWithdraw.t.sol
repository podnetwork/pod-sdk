// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {BridgeBehaviorTest} from "./abstract/Bridge.t.sol";
import {BridgeDepositWithdraw} from "../src/BridgeDepositWithdraw.sol";
import {IBridgeDepositWithdraw} from "../src/interfaces/IBridgeDepositWithdraw.sol";
import {IBridge} from "../src/interfaces/IBridge.sol";
import {Bridge} from "../src/abstract/Bridge.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IPodRegistry} from "../src/interfaces/IPodRegistry.sol";
import {PodRegistry} from "../src/PodRegistry.sol";
import {PodECDSA} from "pod-sdk/verifier/PodECDSA.sol";
import {ECDSA} from "pod-sdk/verifier/ECDSA.sol";
import {MerkleTree} from "pod-sdk/verifier/MerkleTree.sol";
import {AttestedTx} from "../src/libraries/AttestedTx.sol";
import {WrappedToken} from "../src/WrappedToken.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract BridgeDepositWithdrawTest is BridgeBehaviorTest {
    BridgeDepositWithdraw private _bridge;
    WrappedToken private _token;
    IPodRegistry podRegistry;
    uint256[] validatorPrivateKeys;
    uint256 constant NUMBER_OF_VALIDATORS = 4;
    address immutable MIRROR_TOKEN = makeAddr("mirrorToken");
    address immutable OTHER_BRIDGE_CONTRACT = makeAddr("otherBridgeContract");

    function bridge() internal view override returns (Bridge) {
        return _bridge;
    }

    function token() internal view override returns (IERC20) {
        return _token;
    }

    function setUpSuite() public override {
        vm.startPrank(admin);
        address[] memory initialValidators = new address[](NUMBER_OF_VALIDATORS);

        validatorPrivateKeys = new uint256[](NUMBER_OF_VALIDATORS);

        for (uint256 i = 0; i < NUMBER_OF_VALIDATORS; i++) {
            validatorPrivateKeys[i] = uint256(i + 1);
            initialValidators[i] = vm.addr(validatorPrivateKeys[i]);
        }

        podRegistry = new PodRegistry(initialValidators);
        _bridge = new BridgeDepositWithdraw(address(podRegistry), OTHER_BRIDGE_CONTRACT, nativeTokenLimits);

        _token = new WrappedToken("InitialToken", "ITKN", 18);
        _token.mint(user, INITIAL_BALANCE);
        _token.mint(admin, INITIAL_BALANCE);
        _token.approve(address(_bridge), type(uint256).max);
        _bridge.whiteListToken(address(_token), MIRROR_TOKEN, tokenLimits);

        vm.stopPrank();

        vm.prank(user);
        _token.approve(address(_bridge), type(uint256).max);
    }

    // ========== Deposit Tests ==========

    function test_DepositIndex_IncrementsSequentially() public {
        uint256 beforeIdx = _bridge.depositIndex();
        vm.prank(user);
        bridge().deposit(address(token()), tokenLimits.minAmount, user);
        assertEq(_bridge.depositIndex(), beforeIdx + 1);

        vm.prank(user);
        bridge().deposit(address(token()), tokenLimits.minAmount, user);
        assertEq(_bridge.depositIndex(), beforeIdx + 2);
    }

    function test_Deposit_TransfersIntoBridge() public {
        uint256 ub = _token.balanceOf(user);
        uint256 bb = _token.balanceOf(address(_bridge));
        vm.prank(user);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, user);
        assertEq(_token.balanceOf(user), ub - DEPOSIT_AMOUNT);
        assertEq(_token.balanceOf(address(_bridge)), bb + DEPOSIT_AMOUNT);
    }

    function test_DepositNative_EmitsEvent() public {
        vm.deal(user, DEPOSIT_AMOUNT);
        vm.expectEmit(true, true, true, true);
        emit IBridge.DepositNative(0, DEPOSIT_AMOUNT, user);
        vm.prank(user);
        bridge().depositNative{value: DEPOSIT_AMOUNT}(user);
        assertEq(address(bridge()).balance, DEPOSIT_AMOUNT);
    }

    function test_DepositNative_IncrementsIndexSequentially() public {
        vm.deal(user, 2 * DEPOSIT_AMOUNT);
        vm.prank(user);
        _bridge.depositNative{value: DEPOSIT_AMOUNT}(user);
        assertEq(_bridge.depositIndex(), 1);
        vm.prank(user);
        _bridge.depositNative{value: DEPOSIT_AMOUNT}(user);
        assertEq(_bridge.depositIndex(), 2);
    }

    function test_Deposit_RevertWithoutAllowance() public {
        address u = makeAddr("noapprove");
        vm.prank(admin);
        _token.mint(u, DEPOSIT_AMOUNT);
        vm.prank(u);
        vm.expectRevert();
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, u);
    }

    // ========== Claim Tests ==========

    function test_Claim() public {
        // First deposit tokens to the bridge so there's something to claim
        vm.prank(admin);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, admin);

        uint256 initialBalance = _token.balanceOf(user);
        assertEq(_token.balanceOf(address(_bridge)), DEPOSIT_AMOUNT);

        // Create claim proof with all 4 validators signing
        (bytes32 txHash, uint64 committeeEpoch, bytes memory aggregatedSignatures, MerkleTree.MultiProof memory proof) =
            createTokenClaimProof(MIRROR_TOKEN, DEPOSIT_AMOUNT, user, 4);

        // Expect Claim event with actual txHash
        vm.expectEmit(true, true, true, true);
        emit IBridge.Claim(txHash, address(_token), MIRROR_TOKEN, DEPOSIT_AMOUNT, user);
        _bridge.claim(MIRROR_TOKEN, DEPOSIT_AMOUNT, user, committeeEpoch, aggregatedSignatures, proof);

        assertEq(_token.balanceOf(user), initialBalance + DEPOSIT_AMOUNT);
        assertEq(_token.balanceOf(address(_bridge)), 0);

        (, IBridge.TokenUsage memory depositUsage, IBridge.TokenUsage memory claimUsage) =
            bridge().tokenData(address(_token));
        assertEq(depositUsage.consumed, DEPOSIT_AMOUNT);
        assertEq(claimUsage.consumed, DEPOSIT_AMOUNT);
    }

    function test_Claim_RevertIfNotEnoughSignatures() public {
        vm.prank(admin);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, admin);

        // Only 2 signatures (need 3 for 4 validators with threshold 1/1)
        (, uint64 committeeEpoch, bytes memory aggregatedSignatures, MerkleTree.MultiProof memory proof) =
            createTokenClaimProof(MIRROR_TOKEN, DEPOSIT_AMOUNT, user, 2);

        vm.expectRevert("Not enough validator weight");
        _bridge.claim(MIRROR_TOKEN, DEPOSIT_AMOUNT, user, committeeEpoch, aggregatedSignatures, proof);
    }

    function test_Claim_RevertIfInvalidProof() public {
        vm.prank(admin);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, admin);

        (, uint64 committeeEpoch, bytes memory aggregatedSignatures, MerkleTree.MultiProof memory proof) =
            createTokenClaimProof(MIRROR_TOKEN, DEPOSIT_AMOUNT, user, 4);

        // Tamper with the proof by changing a path element
        // This will compute a different root, causing signature verification to fail
        if (proof.path.length > 0) {
            proof.path[0] = bytes32(uint256(proof.path[0]) ^ 1);
        } else {
            // If no path elements, add a fake one to corrupt the proof
            bytes32[] memory tamperedPath = new bytes32[](1);
            tamperedPath[0] = bytes32(uint256(0x1234));
            proof.path = tamperedPath;
        }

        vm.expectRevert(); // Will fail due to signature mismatch on different root
        _bridge.claim(MIRROR_TOKEN, DEPOSIT_AMOUNT, user, committeeEpoch, aggregatedSignatures, proof);
    }

    function test_Claim_RevertIfAlreadyClaimed() public {
        vm.prank(admin);
        _bridge.deposit(address(_token), 2 * DEPOSIT_AMOUNT, admin);

        // Create proof once and reuse for both claims
        (bytes32 txHash, uint64 committeeEpoch, bytes memory aggregatedSignatures, MerkleTree.MultiProof memory proof) =
            createTokenClaimProof(MIRROR_TOKEN, DEPOSIT_AMOUNT, user, 4);

        // First claim should emit Claim event with actual txHash
        vm.expectEmit(true, true, true, true);
        emit IBridge.Claim(txHash, address(_token), MIRROR_TOKEN, DEPOSIT_AMOUNT, user);
        _bridge.claim(MIRROR_TOKEN, DEPOSIT_AMOUNT, user, committeeEpoch, aggregatedSignatures, proof);

        // Second claim with same proof should fail
        vm.expectRevert(abi.encodeWithSelector(IBridge.RequestAlreadyProcessed.selector));
        _bridge.claim(MIRROR_TOKEN, DEPOSIT_AMOUNT, user, committeeEpoch, aggregatedSignatures, proof);
    }

    function test_Claim_RevertIfMirrorTokenNotFound() public {
        address unknownToken = makeAddr("unknownToken");
        (, uint64 committeeEpoch, bytes memory aggregatedSignatures, MerkleTree.MultiProof memory proof) =
            createTokenClaimProof(unknownToken, DEPOSIT_AMOUNT, user, 3);

        vm.expectRevert(abi.encodeWithSelector(IBridge.MirrorTokenNotFound.selector));
        _bridge.claim(unknownToken, DEPOSIT_AMOUNT, user, committeeEpoch, aggregatedSignatures, proof);
    }

    function test_Claim_RevertIfPaused() public {
        vm.prank(admin);
        _bridge.pause();

        (, uint64 committeeEpoch, bytes memory aggregatedSignatures, MerkleTree.MultiProof memory proof) =
            createTokenClaimProof(MIRROR_TOKEN, DEPOSIT_AMOUNT, user, 3);

        vm.expectRevert(abi.encodeWithSelector(Pausable.EnforcedPause.selector));
        _bridge.claim(MIRROR_TOKEN, DEPOSIT_AMOUNT, user, committeeEpoch, aggregatedSignatures, proof);
    }

    function test_Claim_RevertIfInvalidAmount() public {
        vm.prank(admin);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, admin);

        // Try to claim less than minimum
        (, uint64 committeeEpoch, bytes memory aggregatedSignatures, MerkleTree.MultiProof memory proof) =
            createTokenClaimProof(MIRROR_TOKEN, tokenLimits.minAmount - 1, user, 3);

        vm.expectRevert(abi.encodeWithSelector(IBridge.InvalidTokenAmount.selector));
        _bridge.claim(MIRROR_TOKEN, tokenLimits.minAmount - 1, user, committeeEpoch, aggregatedSignatures, proof);
    }

    // ========== ClaimNative Tests ==========

    function test_ClaimNative() public {
        vm.deal(admin, DEPOSIT_AMOUNT);
        vm.prank(admin);
        _bridge.depositNative{value: DEPOSIT_AMOUNT}(admin);
        assertEq(address(bridge()).balance, DEPOSIT_AMOUNT);
        assertEq(user.balance, 0);

        // Create claim proof with all 4 validators signing
        (bytes32 txHash, uint64 committeeEpoch, bytes memory aggregatedSignatures, MerkleTree.MultiProof memory proof) =
            createNativeClaimProof(DEPOSIT_AMOUNT, user, 4);

        // Expect ClaimNative event with actual txHash
        vm.expectEmit(true, true, true, true);
        emit IBridge.ClaimNative(txHash, DEPOSIT_AMOUNT, user);
        _bridge.claimNative(DEPOSIT_AMOUNT, user, committeeEpoch, aggregatedSignatures, proof);

        assertEq(address(bridge()).balance, 0);
        assertEq(user.balance, DEPOSIT_AMOUNT);

        (, IBridge.TokenUsage memory dep, IBridge.TokenUsage memory claimUsage) =
            bridge().tokenData(MOCK_ADDRESS_FOR_NATIVE_DEPOSIT);
        assertEq(dep.consumed, DEPOSIT_AMOUNT);
        assertEq(claimUsage.consumed, DEPOSIT_AMOUNT);
    }

    function test_ClaimNative_RevertIfPaused() public {
        vm.prank(admin);
        _bridge.pause();

        (, uint64 committeeEpoch, bytes memory aggregatedSignatures, MerkleTree.MultiProof memory proof) =
            createNativeClaimProof(DEPOSIT_AMOUNT, user, 3);

        vm.expectRevert(abi.encodeWithSelector(Pausable.EnforcedPause.selector));
        _bridge.claimNative(DEPOSIT_AMOUNT, user, committeeEpoch, aggregatedSignatures, proof);
    }

    function test_ClaimNative_RevertIfNotEnoughSignatures() public {
        vm.deal(admin, DEPOSIT_AMOUNT);
        vm.prank(admin);
        _bridge.depositNative{value: DEPOSIT_AMOUNT}(admin);

        (, uint64 committeeEpoch, bytes memory aggregatedSignatures, MerkleTree.MultiProof memory proof) =
            createNativeClaimProof(DEPOSIT_AMOUNT, user, 2);

        vm.expectRevert("Not enough validator weight");
        _bridge.claimNative(DEPOSIT_AMOUNT, user, committeeEpoch, aggregatedSignatures, proof);
    }

    function test_ClaimNative_RevertIfInvalidAmount() public {
        vm.deal(admin, DEPOSIT_AMOUNT);
        vm.prank(admin);
        _bridge.depositNative{value: DEPOSIT_AMOUNT}(admin);

        (, uint64 committeeEpoch, bytes memory aggregatedSignatures, MerkleTree.MultiProof memory proof) =
            createNativeClaimProof(nativeTokenLimits.minAmount - 1, user, 3);

        vm.expectRevert(abi.encodeWithSelector(IBridge.InvalidTokenAmount.selector));
        _bridge.claimNative(nativeTokenLimits.minAmount - 1, user, committeeEpoch, aggregatedSignatures, proof);
    }

    function test_ClaimNative_RevertIfAlreadyClaimed() public {
        vm.deal(admin, 2 * DEPOSIT_AMOUNT);
        vm.prank(admin);
        _bridge.depositNative{value: 2 * DEPOSIT_AMOUNT}(admin);

        // Create proof once and reuse for both claims
        (bytes32 txHash, uint64 committeeEpoch, bytes memory aggregatedSignatures, MerkleTree.MultiProof memory proof) =
            createNativeClaimProof(DEPOSIT_AMOUNT, user, 4);

        // First claim should emit ClaimNative event with actual txHash
        vm.expectEmit(true, true, true, true);
        emit IBridge.ClaimNative(txHash, DEPOSIT_AMOUNT, user);
        _bridge.claimNative(DEPOSIT_AMOUNT, user, committeeEpoch, aggregatedSignatures, proof);

        // Second claim with same proof should fail
        vm.expectRevert(abi.encodeWithSelector(IBridge.RequestAlreadyProcessed.selector));
        _bridge.claimNative(DEPOSIT_AMOUNT, user, committeeEpoch, aggregatedSignatures, proof);
    }

    // ========== Migration Tests ==========

    function test_Migrate_TransfersAllTokenBalances() public {
        vm.prank(user);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, user);
        vm.prank(admin);
        _bridge.pause();
        uint256 beforeAmt = _token.balanceOf(address(_bridge));
        vm.prank(admin);
        _bridge.migrate(newBridge);
        assertEq(_token.balanceOf(newBridge), beforeAmt);
        assertEq(_token.balanceOf(address(_bridge)), 0);
    }

    function test_Migrate_NoWhitelistedTokens() public {
        vm.prank(admin);
        BridgeDepositWithdraw fresh =
            new BridgeDepositWithdraw(address(podRegistry), OTHER_BRIDGE_CONTRACT, nativeTokenLimits);
        vm.prank(admin);
        fresh.pause();
        vm.prank(admin);
        fresh.migrate(newBridge);
        assertEq(fresh.migratedContract(), newBridge);
    }

    function test_Migrate_SkipsZeroBalanceTokens() public {
        WrappedToken t2 = new WrappedToken("Token", "TKN", 18);
        WrappedToken m2 = new WrappedToken("Mirror", "MRR", 18);
        vm.prank(admin);
        _bridge.whiteListToken(address(t2), address(m2), tokenLimits);
        vm.prank(user);
        _token.approve(address(_bridge), type(uint256).max);
        vm.prank(user);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, user);
        vm.prank(admin);
        _bridge.pause();
        vm.prank(admin);
        _bridge.migrate(newBridge);
        assertEq(_token.balanceOf(newBridge), DEPOSIT_AMOUNT);
        assertEq(t2.balanceOf(newBridge), 0);
    }

    // ========== Whitelist Tests ==========

    function test_Whitelist_RevertIfSameTokenTwiceDifferentMirror() public {
        WrappedToken anotherMirror = new WrappedToken("Token", "TKN", 18);
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(IBridge.InvalidTokenConfig.selector));
        _bridge.whiteListToken(address(_token), address(anotherMirror), tokenLimits);
    }

    function test_WhitelistedTokens_ListGrowsAndOrder() public {
        WrappedToken t2 = new WrappedToken("Token", "TKN", 18);
        WrappedToken m2 = new WrappedToken("Mirror", "MRR", 18);
        vm.prank(admin);
        _bridge.whiteListToken(address(t2), address(m2), tokenLimits);
        assertEq(_bridge.whitelistedTokens(0), address(_token));
        assertEq(_bridge.whitelistedTokens(1), address(t2));
    }

    function test_MultiToken_DepositTracksUsageSeparately() public {
        address t2 = address(0xB0B2);
        WrappedToken t2Mock = new WrappedToken("Token", "TKN", 18);
        vm.prank(admin);
        _bridge.whiteListToken(
            t2,
            address(t2Mock),
            IBridge.TokenLimits({
                minAmount: tokenLimits.minAmount, deposit: tokenLimits.deposit, claim: tokenLimits.claim
            })
        );

        vm.prank(user);
        bridge().deposit(address(token()), tokenLimits.minAmount, user);
        (, IBridge.TokenUsage memory dep1,) = bridge().tokenData(address(token()));
        assertEq(dep1.consumed, tokenLimits.minAmount);

        (, IBridge.TokenUsage memory dep2,) = bridge().tokenData(t2);
        assertEq(dep2.consumed, 0);
    }

    // ========== Token-to-Native Bridging Tests ==========

    function test_Claim_TokenToNative() public {
        // Setup: whitelist where local=native, source=podToken (ERC20 on Pod)
        // When someone deposits podToken on Pod, they claim native here
        address podToken = makeAddr("podToken");
        vm.prank(admin);
        _bridge.whiteListToken(MOCK_ADDRESS_FOR_NATIVE_DEPOSIT, podToken, tokenLimits);

        // Fund the bridge with native tokens
        vm.deal(address(_bridge), DEPOSIT_AMOUNT);

        uint256 initialBalance = user.balance;
        assertEq(address(_bridge).balance, DEPOSIT_AMOUNT);

        // Create claim proof for token deposit that results in native payout
        (bytes32 txHash, uint64 committeeEpoch, bytes memory aggregatedSignatures, MerkleTree.MultiProof memory proof) =
            createTokenClaimProofForNative(podToken, DEPOSIT_AMOUNT, user, 4);

        // Expect ClaimNative event (since output is native)
        vm.expectEmit(true, true, true, true);
        emit IBridge.ClaimNative(txHash, DEPOSIT_AMOUNT, user);
        _bridge.claim(podToken, DEPOSIT_AMOUNT, user, committeeEpoch, aggregatedSignatures, proof);

        assertEq(user.balance, initialBalance + DEPOSIT_AMOUNT);
        assertEq(address(_bridge).balance, 0);
    }

    function test_Claim_TokenToNative_RevertIfNotEnoughSignatures() public {
        address podToken = makeAddr("podToken");
        vm.prank(admin);
        _bridge.whiteListToken(MOCK_ADDRESS_FOR_NATIVE_DEPOSIT, podToken, tokenLimits);

        vm.deal(address(_bridge), DEPOSIT_AMOUNT);

        (, uint64 committeeEpoch, bytes memory aggregatedSignatures, MerkleTree.MultiProof memory proof) =
            createTokenClaimProofForNative(podToken, DEPOSIT_AMOUNT, user, 2);

        vm.expectRevert("Not enough validator weight");
        _bridge.claim(podToken, DEPOSIT_AMOUNT, user, committeeEpoch, aggregatedSignatures, proof);
    }

    function test_ClaimNative_NativeToToken() public {
        // Setup: configure native-to-token mapping
        // local=nativeOutputToken (ERC20), source=native (MOCK_ADDRESS_FOR_NATIVE_DEPOSIT)
        // When someone deposits native on Pod, they claim nativeOutputToken here
        WrappedToken nativeOutputToken = new WrappedToken("NativeOutput", "NOUT", 18);
        vm.prank(admin);
        _bridge.whiteListToken(address(nativeOutputToken), MOCK_ADDRESS_FOR_NATIVE_DEPOSIT, tokenLimits);

        // Mint tokens to bridge for payout
        nativeOutputToken.mint(address(_bridge), DEPOSIT_AMOUNT);

        uint256 initialTokenBalance = nativeOutputToken.balanceOf(user);

        // Create claim proof for native deposit that results in token payout
        (bytes32 txHash, uint64 committeeEpoch, bytes memory aggregatedSignatures, MerkleTree.MultiProof memory proof) =
            createNativeClaimProof(DEPOSIT_AMOUNT, user, 4);

        // Expect Claim event (since output is token)
        vm.expectEmit(true, true, true, true);
        emit IBridge.Claim(txHash, address(nativeOutputToken), address(0), DEPOSIT_AMOUNT, user);
        _bridge.claimNative(DEPOSIT_AMOUNT, user, committeeEpoch, aggregatedSignatures, proof);

        assertEq(nativeOutputToken.balanceOf(user), initialTokenBalance + DEPOSIT_AMOUNT);
    }

    function test_ClaimNative_NativeToToken_RevertIfNotEnoughSignatures() public {
        WrappedToken nativeOutputToken = new WrappedToken("NativeOutput", "NOUT", 18);
        vm.prank(admin);
        _bridge.whiteListToken(address(nativeOutputToken), MOCK_ADDRESS_FOR_NATIVE_DEPOSIT, tokenLimits);

        nativeOutputToken.mint(address(_bridge), DEPOSIT_AMOUNT);

        (, uint64 committeeEpoch, bytes memory aggregatedSignatures, MerkleTree.MultiProof memory proof) =
            createNativeClaimProof(DEPOSIT_AMOUNT, user, 2);

        vm.expectRevert("Not enough validator weight");
        _bridge.claimNative(DEPOSIT_AMOUNT, user, committeeEpoch, aggregatedSignatures, proof);
    }

    function test_WhitelistNativeToToken() public {
        // local=nativeOutputToken (ERC20), source=native (MOCK_ADDRESS_FOR_NATIVE_DEPOSIT)
        WrappedToken nativeOutputToken = new WrappedToken("NativeOutput", "NOUT", 18);
        vm.prank(admin);
        _bridge.whiteListToken(address(nativeOutputToken), MOCK_ADDRESS_FOR_NATIVE_DEPOSIT, tokenLimits);

        // Check that mirrorTokens[MOCK_ADDRESS_FOR_NATIVE_DEPOSIT] = nativeOutputToken
        assertEq(_bridge.mirrorTokens(MOCK_ADDRESS_FOR_NATIVE_DEPOSIT), address(nativeOutputToken));
    }

    function test_WhitelistNativeToToken_RevertIfAlreadySet() public {
        WrappedToken nativeOutputToken = new WrappedToken("NativeOutput", "NOUT", 18);
        WrappedToken anotherToken = new WrappedToken("Another", "ANO", 18);

        vm.prank(admin);
        _bridge.whiteListToken(address(nativeOutputToken), MOCK_ADDRESS_FOR_NATIVE_DEPOSIT, tokenLimits);

        // Second call should revert
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(IBridge.InvalidTokenConfig.selector));
        _bridge.whiteListToken(address(anotherToken), MOCK_ADDRESS_FOR_NATIVE_DEPOSIT, tokenLimits);
    }

    function test_WhitelistTokenToNative() public {
        // local=native (MOCK_ADDRESS_FOR_NATIVE_DEPOSIT), source=podToken (ERC20 on Pod)
        address podToken = makeAddr("podToken");
        vm.prank(admin);
        _bridge.whiteListToken(MOCK_ADDRESS_FOR_NATIVE_DEPOSIT, podToken, tokenLimits);

        // Check that mirrorTokens maps podToken to MOCK_ADDRESS_FOR_NATIVE_DEPOSIT
        // MOCK_ADDRESS_FOR_NATIVE_DEPOSIT = address(uint160(uint256(keccak256("MOCK_ADDRESS_FOR_NATIVE_DEPOSIT"))))
        address expectedMockAddress = address(uint160(uint256(keccak256("MOCK_ADDRESS_FOR_NATIVE_DEPOSIT"))));
        assertEq(_bridge.mirrorTokens(podToken), expectedMockAddress);
    }

    // ========== Helper Functions ==========

    function sortLeaves(bytes32[] memory leaves) internal pure {
        uint256 n = leaves.length;
        for (uint256 i = 1; i < n; ++i) {
            bytes32 key = leaves[i];
            uint256 j = i;
            while (j > 0 && leaves[j - 1] > key) {
                leaves[j] = leaves[j - 1];
                unchecked {
                    j--;
                }
            }
            leaves[j] = key;
        }
    }

    // OpenZeppelin's commutativeKeccak256 - sorts the two values before hashing
    function commutativeKeccak256(bytes32 a, bytes32 b) internal pure returns (bytes32) {
        return a < b ? keccak256(abi.encodePacked(a, b)) : keccak256(abi.encodePacked(b, a));
    }

    // Build complete merkle tree from 5 sorted leaves and return the root
    // Tree structure for 5 leaves (indices in array):
    //          0
    //        /   \
    //       1     2
    //      / \   / \
    //     3   4 5   6
    //    / \
    //   7   8
    // Leaves are at indices: 4, 5, 6, 7, 8 (for 5 leaves)
    function buildMerkleTree(bytes32[] memory sortedLeaves) internal pure returns (bytes32) {
        uint256 n = sortedLeaves.length;
        if (n == 0) return bytes32(0);
        if (n == 1) return sortedLeaves[0];

        uint256 treeLen = 2 * n - 1;
        bytes32[] memory tree = new bytes32[](treeLen);

        // Place leaves at the end of the tree array (in reverse order)
        for (uint256 i = 0; i < n; i++) {
            tree[treeLen - 1 - i] = sortedLeaves[i];
        }

        // Build tree from bottom up
        for (uint256 i = treeLen - n; i > 0;) {
            unchecked {
                i--;
            }
            uint256 leftIdx = 2 * i + 1;
            uint256 rightIdx = 2 * i + 2;
            tree[i] = commutativeKeccak256(tree[leftIdx], tree[rightIdx]);
        }

        return tree[0];
    }

    // Find the index of a leaf in the sorted leaves array, then map to tree index
    function findLeafTreeIndex(bytes32[] memory sortedLeaves, bytes32 leaf) internal pure returns (uint256) {
        uint256 n = sortedLeaves.length;
        uint256 treeLen = 2 * n - 1;
        for (uint256 i = 0; i < n; i++) {
            if (sortedLeaves[i] == leaf) {
                return treeLen - 1 - i;
            }
        }
        revert("Leaf not found");
    }

    // Generate multi-proof for given leaves from a tree built from sortedLeaves
    function generateMultiProof(bytes32[] memory sortedLeaves, bytes32[] memory proofLeaves)
        internal
        pure
        returns (MerkleTree.MultiProof memory)
    {
        uint256 n = sortedLeaves.length;
        uint256 treeLen = 2 * n - 1;

        // Build the full tree
        bytes32[] memory tree = new bytes32[](treeLen);
        for (uint256 i = 0; i < n; i++) {
            tree[treeLen - 1 - i] = sortedLeaves[i];
        }
        for (uint256 i = treeLen - n; i > 0;) {
            unchecked {
                i--;
            }
            uint256 leftIdx = 2 * i + 1;
            uint256 rightIdx = 2 * i + 2;
            tree[i] = commutativeKeccak256(tree[leftIdx], tree[rightIdx]);
        }

        // Get tree indices for proof leaves (sorted in descending order)
        uint256[] memory indices = new uint256[](proofLeaves.length);
        for (uint256 i = 0; i < proofLeaves.length; i++) {
            indices[i] = findLeafTreeIndex(sortedLeaves, proofLeaves[i]);
        }
        // Sort indices in descending order
        for (uint256 i = 0; i < indices.length; i++) {
            for (uint256 j = i + 1; j < indices.length; j++) {
                if (indices[j] > indices[i]) {
                    (indices[i], indices[j]) = (indices[j], indices[i]);
                }
            }
        }

        // Generate multi-proof using the same algorithm as Rust implementation
        bytes32[] memory pathDynamic = new bytes32[](treeLen);
        bool[] memory flagsDynamic = new bool[](treeLen);
        uint256 pathLen = 0;
        uint256 flagsLen = 0;

        // Use a queue-like approach with fixed array
        uint256[] memory stack = new uint256[](treeLen);
        uint256 stackStart = 0;
        uint256 stackEnd = indices.length;
        for (uint256 i = 0; i < indices.length; i++) {
            stack[i] = indices[i];
        }

        while (stackStart < stackEnd) {
            uint256 j = stack[stackStart];
            stackStart++;

            if (j == 0) break;

            uint256 s = (j % 2 == 0) ? j - 1 : j + 1; // sibling
            uint256 p = (j - 1) / 2; // parent

            bool siblingInStack = false;
            if (stackStart < stackEnd && stack[stackStart] == s) {
                siblingInStack = true;
            }

            if (siblingInStack) {
                flagsDynamic[flagsLen++] = true;
                stackStart++; // pop sibling
            } else {
                flagsDynamic[flagsLen++] = false;
                pathDynamic[pathLen++] = tree[s];
            }

            stack[stackEnd++] = p;
        }

        // Copy to correctly sized arrays
        bytes32[] memory path = new bytes32[](pathLen);
        bool[] memory flags = new bool[](flagsLen);
        for (uint256 i = 0; i < pathLen; i++) {
            path[i] = pathDynamic[i];
        }
        for (uint256 i = 0; i < flagsLen; i++) {
            flags[i] = flagsDynamic[i];
        }

        return MerkleTree.MultiProof({path: path, flags: flags});
    }

    function createTokenClaimProof(address claimToken, uint256 amount, address to, uint256 numberOfRequiredSignatures)
        internal
        view
        returns (
            bytes32 txHash,
            uint64 committeeEpoch,
            bytes memory aggregatedSignatures,
            MerkleTree.MultiProof memory proof
        )
    {
        committeeEpoch = 0;

        // Build all 5 leaves for the complete transaction merkle tree
        // Following the Rust Merkleizable implementation for SignedTransaction:
        // from, to, value, input, nonce
        bytes4 selector = bytes4(keccak256("deposit(address,uint256,address)"));
        address txFrom = address(0xDEAD); // arbitrary sender
        uint256 txValue = 0; // no native value for ERC20 deposit
        uint64 txNonce = 0;

        bytes32[] memory allLeaves = new bytes32[](5);
        allLeaves[0] = MerkleTree.hashLeaf("from", keccak256(abi.encode(txFrom)));
        allLeaves[1] = MerkleTree.hashLeaf("to", keccak256(abi.encode(OTHER_BRIDGE_CONTRACT)));
        allLeaves[2] = MerkleTree.hashLeaf("value", keccak256(abi.encode(txValue)));
        allLeaves[3] =
            MerkleTree.hashLeaf("input", keccak256(abi.encodePacked(selector, abi.encode(claimToken, amount, to))));
        allLeaves[4] = MerkleTree.hashLeaf("nonce", keccak256(abi.encode(txNonce)));

        sortLeaves(allLeaves);

        // Build complete merkle tree and get root (txHash)
        txHash = buildMerkleTree(allLeaves);

        // The contract verifies 2 leaves: to, input
        bytes32[] memory proofLeaves = new bytes32[](2);
        proofLeaves[0] = MerkleTree.hashLeaf("to", keccak256(abi.encode(OTHER_BRIDGE_CONTRACT)));
        proofLeaves[1] =
            MerkleTree.hashLeaf("input", keccak256(abi.encodePacked(selector, abi.encode(claimToken, amount, to))));
        sortLeaves(proofLeaves);

        // Generate multi-proof
        proof = generateMultiProof(allLeaves, proofLeaves);

        // Sign the attested transaction
        AttestedTx.AttestedTx memory attested = AttestedTx.AttestedTx({hash: txHash, committee_epoch: committeeEpoch});
        bytes32 attestedHash = AttestedTx.digest(attested);
        bytes32 signedHash = keccak256(abi.encode(attestedHash));

        bytes[] memory signatures = new bytes[](numberOfRequiredSignatures);
        for (uint256 i = 0; i < numberOfRequiredSignatures; i++) {
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(validatorPrivateKeys[i], signedHash);
            signatures[i] = ECDSA._serialize_signature(v, r, s);
        }
        aggregatedSignatures = ECDSA.aggregate_signatures(signatures);
    }

    function createNativeClaimProof(uint256 amount, address to, uint256 numberOfRequiredSignatures)
        internal
        view
        returns (
            bytes32 txHash,
            uint64 committeeEpoch,
            bytes memory aggregatedSignatures,
            MerkleTree.MultiProof memory proof
        )
    {
        committeeEpoch = 0;

        // Build all 5 leaves for the complete transaction merkle tree
        bytes4 selector = bytes4(keccak256("depositNative(address)"));
        address txFrom = address(0xDEAD); // arbitrary sender
        uint64 txNonce = 0;

        bytes32[] memory allLeaves = new bytes32[](5);
        allLeaves[0] = MerkleTree.hashLeaf("from", keccak256(abi.encode(txFrom)));
        allLeaves[1] = MerkleTree.hashLeaf("to", keccak256(abi.encode(OTHER_BRIDGE_CONTRACT)));
        allLeaves[2] = MerkleTree.hashLeaf("value", keccak256(abi.encode(amount)));
        allLeaves[3] = MerkleTree.hashLeaf("input", keccak256(abi.encodePacked(selector, abi.encode(to))));
        allLeaves[4] = MerkleTree.hashLeaf("nonce", keccak256(abi.encode(txNonce)));

        sortLeaves(allLeaves);

        // Build complete merkle tree and get root (txHash)
        txHash = buildMerkleTree(allLeaves);

        // The contract verifies 3 leaves: to, value, input
        bytes32[] memory proofLeaves = new bytes32[](3);
        proofLeaves[0] = MerkleTree.hashLeaf("to", keccak256(abi.encode(OTHER_BRIDGE_CONTRACT)));
        proofLeaves[1] = MerkleTree.hashLeaf("value", keccak256(abi.encode(amount)));
        proofLeaves[2] = MerkleTree.hashLeaf("input", keccak256(abi.encodePacked(selector, abi.encode(to))));
        sortLeaves(proofLeaves);

        // Generate multi-proof
        proof = generateMultiProof(allLeaves, proofLeaves);

        // Sign the attested transaction
        AttestedTx.AttestedTx memory attested = AttestedTx.AttestedTx({hash: txHash, committee_epoch: committeeEpoch});
        bytes32 attestedHash = AttestedTx.digest(attested);
        bytes32 signedHash = keccak256(abi.encode(attestedHash));

        bytes[] memory signatures = new bytes[](numberOfRequiredSignatures);
        for (uint256 i = 0; i < numberOfRequiredSignatures; i++) {
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(validatorPrivateKeys[i], signedHash);
            signatures[i] = ECDSA._serialize_signature(v, r, s);
        }
        aggregatedSignatures = ECDSA.aggregate_signatures(signatures);
    }

    // Helper for token-to-native claims (same structure as createTokenClaimProof but named differently for clarity)
    function createTokenClaimProofForNative(
        address claimToken,
        uint256 amount,
        address to,
        uint256 numberOfRequiredSignatures
    )
        internal
        view
        returns (
            bytes32 txHash,
            uint64 committeeEpoch,
            bytes memory aggregatedSignatures,
            MerkleTree.MultiProof memory proof
        )
    {
        // Uses same logic as createTokenClaimProof since the source transaction is deposit()
        return createTokenClaimProof(claimToken, amount, to, numberOfRequiredSignatures);
    }
}
