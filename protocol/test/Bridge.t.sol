// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {BridgeBehaviorTest} from "./abstract/Bridge.t.sol";
import {BridgeClaimProofHelper} from "./abstract/BridgeClaimProofHelper.sol";
import {Bridge} from "../src/Bridge.sol";
import {IBridge} from "../src/interfaces/IBridge.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Registry} from "../src/Registry.sol";
import {WrappedToken} from "../src/WrappedToken.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract BridgeTest is BridgeBehaviorTest, BridgeClaimProofHelper {
    Bridge private _bridge;
    WrappedToken private _token;
    Registry podRegistry;
    uint256 constant NUMBER_OF_VALIDATORS = 4;
    address immutable MIRROR_TOKEN = makeAddr("mirrorToken");

    function bridge() internal view override returns (Bridge) {
        return _bridge;
    }

    function token() internal view override returns (IERC20) {
        return _token;
    }

    function setUpSuite() public override {
        vm.startPrank(admin);
        uint8 f = uint8((NUMBER_OF_VALIDATORS - 1) / 3);
        address[] memory initialValidators = new address[](NUMBER_OF_VALIDATORS);

        validatorPrivateKeys = new uint256[](NUMBER_OF_VALIDATORS);
        otherBridgeContract = makeAddr("otherBridgeContract");

        for (uint256 i = 0; i < NUMBER_OF_VALIDATORS; i++) {
            validatorPrivateKeys[i] = uint256(i + 1);
            initialValidators[i] = vm.addr(validatorPrivateKeys[i]);
        }

        podRegistry = new Registry(initialValidators, f);
        _bridge = new Bridge(address(podRegistry), otherBridgeContract, block.chainid);

        _token = new WrappedToken("InitialToken", "ITKN", 18);
        _token.mint(user, INITIAL_BALANCE);
        _token.mint(admin, INITIAL_BALANCE);
        _token.approve(address(_bridge), type(uint256).max);
        _bridge.whiteListToken(address(_token), MIRROR_TOKEN, minAmount, depositLimit, claimLimit);

        vm.stopPrank();

        vm.prank(user);
        _token.approve(address(_bridge), type(uint256).max);
    }

    // ========== Deposit Tests ==========

    function test_DepositIndex_IncrementsSequentially() public {
        uint256 beforeIdx = _bridge.depositIndex();
        vm.prank(user);
        bridge().deposit(address(token()), minAmount, user, "");
        assertEq(_bridge.depositIndex(), beforeIdx + 1);

        vm.prank(user);
        bridge().deposit(address(token()), minAmount, user, "");
        assertEq(_bridge.depositIndex(), beforeIdx + 2);
    }

    function test_Deposit_TransfersIntoBridge() public {
        uint256 ub = _token.balanceOf(user);
        uint256 bb = _token.balanceOf(address(_bridge));
        vm.prank(user);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, user, "");
        assertEq(_token.balanceOf(user), ub - DEPOSIT_AMOUNT);
        assertEq(_token.balanceOf(address(_bridge)), bb + DEPOSIT_AMOUNT);
    }

    function test_Deposit_RevertWithoutAllowance() public {
        address u = makeAddr("noapprove");
        vm.prank(admin);
        _token.mint(u, DEPOSIT_AMOUNT);
        vm.prank(u);
        vm.expectRevert();
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, u, "");
    }

    // ========== Claim Tests ==========

    function test_Claim() public {
        // First deposit tokens to the bridge so there's something to claim
        vm.prank(admin);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, admin, "");

        uint256 initialBalance = _token.balanceOf(user);
        assertEq(_token.balanceOf(address(_bridge)), DEPOSIT_AMOUNT);

        // Create claim proof with all 4 validators signing
        // The proof is for a deposit of MIRROR_TOKEN on the source chain
        (bytes32 txHash, uint64 committeeEpoch, bytes memory aggregatedSignatures, bytes memory proof) =
            createTokenClaimProof(MIRROR_TOKEN, DEPOSIT_AMOUNT, user, 4, _bridge.DOMAIN_SEPARATOR());

        // Expect Claim event - first param is local token, second is mirror token
        vm.expectEmit(true, true, true, true);
        emit IBridge.Claim(txHash, address(_token), MIRROR_TOKEN, DEPOSIT_AMOUNT, user);
        // claim() takes local token as first param, contract looks up mirrorToken from tokenData
        _bridge.claim(address(_token), DEPOSIT_AMOUNT, user, committeeEpoch, aggregatedSignatures, proof);

        assertEq(_token.balanceOf(user), initialBalance + DEPOSIT_AMOUNT);
        assertEq(_token.balanceOf(address(_bridge)), 0);

        (,,, IBridge.TokenUsage memory depositUsage, IBridge.TokenUsage memory claimUsage,) =
            bridge().tokenData(address(_token));
        assertEq(depositUsage.consumed, DEPOSIT_AMOUNT);
        assertEq(claimUsage.consumed, DEPOSIT_AMOUNT);
    }

    function test_Claim_RevertIfNotEnoughSignatures() public {
        vm.prank(admin);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, admin, "");

        // Only 2 signatures (need 3 for 4 validators with threshold 1/1)
        (, uint64 committeeEpoch, bytes memory aggregatedSignatures, bytes memory proof) =
            createTokenClaimProof(MIRROR_TOKEN, DEPOSIT_AMOUNT, user, 2, _bridge.DOMAIN_SEPARATOR());

        vm.expectRevert("Not enough validator weight");
        _bridge.claim(address(_token), DEPOSIT_AMOUNT, user, committeeEpoch, aggregatedSignatures, proof);
    }

    function test_Claim_RevertIfInvalidProof() public {
        vm.prank(admin);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, admin, "");

        (, uint64 committeeEpoch, bytes memory aggregatedSignatures, bytes memory proof) =
            createTokenClaimProof(MIRROR_TOKEN, DEPOSIT_AMOUNT, user, 4, _bridge.DOMAIN_SEPARATOR());

        bytes memory tamperedProof = bytes.concat(proof, abi.encode(keccak256("tamper")));

        vm.expectRevert(); // Will fail due to signature mismatch on different root
        _bridge.claim(address(_token), DEPOSIT_AMOUNT, user, committeeEpoch, aggregatedSignatures, tamperedProof);
    }

    function test_Claim_RevertIfAlreadyClaimed() public {
        vm.prank(admin);
        _bridge.deposit(address(_token), 2 * DEPOSIT_AMOUNT, admin, "");

        // Create proof once and reuse for both claims
        (bytes32 txHash, uint64 committeeEpoch, bytes memory aggregatedSignatures, bytes memory proof) =
            createTokenClaimProof(MIRROR_TOKEN, DEPOSIT_AMOUNT, user, 4, _bridge.DOMAIN_SEPARATOR());

        // First claim should emit Claim event with actual txHash
        vm.expectEmit(true, true, true, true);
        emit IBridge.Claim(txHash, address(_token), MIRROR_TOKEN, DEPOSIT_AMOUNT, user);
        _bridge.claim(address(_token), DEPOSIT_AMOUNT, user, committeeEpoch, aggregatedSignatures, proof);

        // Second claim with same proof should fail
        vm.expectRevert(abi.encodeWithSelector(IBridge.RequestAlreadyProcessed.selector));
        _bridge.claim(address(_token), DEPOSIT_AMOUNT, user, committeeEpoch, aggregatedSignatures, proof);
    }

    function test_Claim_RevertIfTokenNotWhitelisted() public {
        address unknownToken = makeAddr("unknownToken");
        (, uint64 committeeEpoch, bytes memory aggregatedSignatures, bytes memory proof) =
            createTokenClaimProof(unknownToken, DEPOSIT_AMOUNT, user, 3, _bridge.DOMAIN_SEPARATOR());

        // Claiming with an unknown local token fails because tokenData[unknownToken].minAmount == 0
        vm.expectRevert(abi.encodeWithSelector(IBridge.InvalidTokenConfig.selector));
        _bridge.claim(unknownToken, DEPOSIT_AMOUNT, user, committeeEpoch, aggregatedSignatures, proof);
    }

    function test_Claim_RevertIfPaused() public {
        vm.prank(admin);
        _bridge.pause();

        (, uint64 committeeEpoch, bytes memory aggregatedSignatures, bytes memory proof) =
            createTokenClaimProof(MIRROR_TOKEN, DEPOSIT_AMOUNT, user, 3, _bridge.DOMAIN_SEPARATOR());

        vm.expectRevert(abi.encodeWithSelector(Pausable.EnforcedPause.selector));
        _bridge.claim(address(_token), DEPOSIT_AMOUNT, user, committeeEpoch, aggregatedSignatures, proof);
    }

    function test_Claim_RevertIfInvalidAmount() public {
        vm.prank(admin);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, admin, "");

        // Try to claim less than minimum
        (, uint64 committeeEpoch, bytes memory aggregatedSignatures, bytes memory proof) =
            createTokenClaimProof(MIRROR_TOKEN, minAmount - 1, user, 3, _bridge.DOMAIN_SEPARATOR());

        vm.expectRevert(abi.encodeWithSelector(IBridge.InvalidTokenAmount.selector));
        _bridge.claim(address(_token), minAmount - 1, user, committeeEpoch, aggregatedSignatures, proof);
    }

    // ========== Migration Tests ==========

    function test_Migrate_TransfersAllTokenBalances() public {
        vm.prank(user);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, user, "");
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
        Bridge fresh = new Bridge(address(podRegistry), otherBridgeContract, block.chainid);
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
        _bridge.whiteListToken(address(t2), address(m2), minAmount, depositLimit, claimLimit);
        vm.prank(user);
        _token.approve(address(_bridge), type(uint256).max);
        vm.prank(user);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, user, "");
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
        _bridge.whiteListToken(address(_token), address(anotherMirror), minAmount, depositLimit, claimLimit);
    }

    function test_WhitelistedTokens_ListGrowsAndOrder() public {
        WrappedToken t2 = new WrappedToken("Token", "TKN", 18);
        WrappedToken m2 = new WrappedToken("Mirror", "MRR", 18);
        vm.prank(admin);
        _bridge.whiteListToken(address(t2), address(m2), minAmount, depositLimit, claimLimit);
        assertEq(_bridge.whitelistedTokens(0), address(_token));
        assertEq(_bridge.whitelistedTokens(1), address(t2));
    }

    function test_MultiToken_DepositTracksUsageSeparately() public {
        address t2 = address(0xB0B2);
        WrappedToken t2Mock = new WrappedToken("Token", "TKN", 18);
        vm.prank(admin);
        _bridge.whiteListToken(t2, address(t2Mock), minAmount, depositLimit, claimLimit);

        vm.prank(user);
        bridge().deposit(address(token()), minAmount, user, "");
        (,,, IBridge.TokenUsage memory dep1,,) = bridge().tokenData(address(token()));
        assertEq(dep1.consumed, minAmount);

        (,,, IBridge.TokenUsage memory dep2,,) = bridge().tokenData(t2);
        assertEq(dep2.consumed, 0);
    }

    // ========== Native Deposit Not Supported ==========

    function test_DepositNative_NotSupported() public {
        vm.deal(user, DEPOSIT_AMOUNT);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(IBridge.InvalidTokenConfig.selector));
        bridge().deposit(address(0), 0, user, "");
    }
}
