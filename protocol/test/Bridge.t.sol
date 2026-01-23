// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {BridgeBehaviorTest} from "./abstract/Bridge.t.sol";
import {BridgeClaimProofHelper} from "./abstract/BridgeClaimProofHelper.sol";
import {Bridge} from "../src/Bridge.sol";
import {IBridge} from "../src/interfaces/IBridge.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Registry} from "../src/Registry.sol";
import {WrappedToken} from "../src/WrappedToken.sol";
import {MockERC20Permit} from "./mocks/MockERC20Permit.sol";

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
        _bridge.setState(IBridge.ContractState.Paused);

        (, uint64 committeeEpoch, bytes memory aggregatedSignatures, bytes memory proof) =
            createTokenClaimProof(MIRROR_TOKEN, DEPOSIT_AMOUNT, user, 3, _bridge.DOMAIN_SEPARATOR());

        vm.expectRevert(IBridge.ContractPaused.selector);
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
        vm.startPrank(admin);
        _bridge.setState(IBridge.ContractState.Paused);
        uint256 beforeAmt = _token.balanceOf(address(_bridge));
        _bridge.migrate(newBridge);

        // Tokens not transferred yet
        assertEq(_token.balanceOf(newBridge), 0);
        assertEq(_token.balanceOf(address(_bridge)), beforeAmt);

        // Transfer tokens to migrated contract
        address[] memory tokens = new address[](1);
        tokens[0] = address(_token);
        _bridge.transferTokensToMigrated(tokens);
        vm.stopPrank();

        assertEq(_token.balanceOf(newBridge), beforeAmt);
        assertEq(_token.balanceOf(address(_bridge)), 0);
    }

    function test_Migrate_NoWhitelistedTokens() public {
        vm.prank(admin);
        Bridge fresh = new Bridge(address(podRegistry), otherBridgeContract, block.chainid);
        vm.prank(admin);
        fresh.setState(IBridge.ContractState.Paused);
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
        vm.startPrank(admin);
        _bridge.setState(IBridge.ContractState.Paused);
        _bridge.migrate(newBridge);

        // Transfer both tokens (one with balance, one without)
        address[] memory tokens = new address[](2);
        tokens[0] = address(_token);
        tokens[1] = address(t2);
        _bridge.transferTokensToMigrated(tokens);
        vm.stopPrank();

        assertEq(_token.balanceOf(newBridge), DEPOSIT_AMOUNT);
        assertEq(t2.balanceOf(newBridge), 0);
    }

    function test_TransferTokensToMigrated_CanBeCalledMultipleTimes() public {
        // Setup: two tokens with balances
        WrappedToken t2 = new WrappedToken("Token2", "TK2", 18);
        WrappedToken m2 = new WrappedToken("Mirror2", "MR2", 18);
        vm.prank(admin);
        _bridge.whiteListToken(address(t2), address(m2), minAmount, depositLimit, claimLimit);

        vm.prank(user);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, user, "");

        t2.mint(address(_bridge), DEPOSIT_AMOUNT);

        vm.startPrank(admin);
        _bridge.setState(IBridge.ContractState.Paused);
        _bridge.migrate(newBridge);

        // First transfer: only _token
        address[] memory tokens1 = new address[](1);
        tokens1[0] = address(_token);
        _bridge.transferTokensToMigrated(tokens1);

        assertEq(_token.balanceOf(newBridge), DEPOSIT_AMOUNT);
        assertEq(t2.balanceOf(newBridge), 0);

        // Second transfer: only t2
        address[] memory tokens2 = new address[](1);
        tokens2[0] = address(t2);
        _bridge.transferTokensToMigrated(tokens2);

        assertEq(_token.balanceOf(newBridge), DEPOSIT_AMOUNT);
        assertEq(t2.balanceOf(newBridge), DEPOSIT_AMOUNT);
        vm.stopPrank();
    }

    function test_TransferTokensToMigrated_RevertIfNotMigrated() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(_token);

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(IBridge.ContractNotPaused.selector));
        _bridge.transferTokensToMigrated(tokens);
    }

    function test_TransferTokensToMigrated_RevertIfNotAdmin() public {
        vm.startPrank(admin);
        _bridge.setState(IBridge.ContractState.Paused);
        _bridge.migrate(newBridge);
        vm.stopPrank();

        address[] memory tokens = new address[](1);
        tokens[0] = address(_token);

        vm.prank(user);
        vm.expectRevert();
        _bridge.transferTokensToMigrated(tokens);
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

    // ========== Permit Tests ==========

    function test_Deposit_WithPermit() public {
        // Create a permit-enabled token
        MockERC20Permit permitToken = new MockERC20Permit("PermitToken", "PTK", 18);
        address mirrorPermitToken = makeAddr("mirrorPermitToken");

        vm.prank(admin);
        _bridge.whiteListToken(address(permitToken), mirrorPermitToken, minAmount, depositLimit, claimLimit);

        // Create a user with a private key for signing
        uint256 userPrivateKey = 0x1234;
        address permitUser = vm.addr(userPrivateKey);
        permitToken.mint(permitUser, INITIAL_BALANCE);

        // Build permit signature
        uint256 deadline = block.timestamp + 1 hours;
        bytes32 permitTypehash =
            keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
        bytes32 domainSeparator = permitToken.DOMAIN_SEPARATOR();

        bytes32 structHash =
            keccak256(abi.encode(permitTypehash, permitUser, address(_bridge), DEPOSIT_AMOUNT, 0, deadline));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, digest);

        // Pack permit data: deadline(32) + v(1) + r(32) + s(32) = 97 bytes
        bytes memory permit = abi.encodePacked(deadline, v, r, s);

        // Deposit with permit (no prior approval needed)
        uint256 balanceBefore = permitToken.balanceOf(permitUser);
        vm.prank(permitUser);
        _bridge.deposit(address(permitToken), DEPOSIT_AMOUNT, permitUser, permit);

        assertEq(permitToken.balanceOf(permitUser), balanceBefore - DEPOSIT_AMOUNT);
        assertEq(permitToken.balanceOf(address(_bridge)), DEPOSIT_AMOUNT);
    }

    function test_Deposit_WithInvalidPermitLength_Reverts() public {
        MockERC20Permit permitToken = new MockERC20Permit("PermitToken", "PTK", 18);
        address mirrorPermitToken = makeAddr("mirrorPermitToken");

        vm.prank(admin);
        _bridge.whiteListToken(address(permitToken), mirrorPermitToken, minAmount, depositLimit, claimLimit);

        address permitUser = makeAddr("permitUser");
        permitToken.mint(permitUser, INITIAL_BALANCE);

        // Invalid permit length (not 97 bytes)
        bytes memory invalidPermit = abi.encodePacked(uint256(1), uint8(27), bytes32(0));

        vm.prank(permitUser);
        vm.expectRevert(abi.encodeWithSelector(IBridge.InvalidPermitLength.selector));
        _bridge.deposit(address(permitToken), DEPOSIT_AMOUNT, permitUser, invalidPermit);
    }

    function test_Deposit_WithEmptyPermit_RequiresApproval() public {
        MockERC20Permit permitToken = new MockERC20Permit("PermitToken", "PTK", 18);
        address mirrorPermitToken = makeAddr("mirrorPermitToken");

        vm.prank(admin);
        _bridge.whiteListToken(address(permitToken), mirrorPermitToken, minAmount, depositLimit, claimLimit);

        address permitUser = makeAddr("permitUser");
        permitToken.mint(permitUser, INITIAL_BALANCE);

        // Without approval and empty permit, should fail
        vm.prank(permitUser);
        vm.expectRevert();
        _bridge.deposit(address(permitToken), DEPOSIT_AMOUNT, permitUser, "");

        // With approval and empty permit, should succeed
        vm.prank(permitUser);
        permitToken.approve(address(_bridge), DEPOSIT_AMOUNT);

        vm.prank(permitUser);
        _bridge.deposit(address(permitToken), DEPOSIT_AMOUNT, permitUser, "");

        assertEq(permitToken.balanceOf(address(_bridge)), DEPOSIT_AMOUNT);
    }

    // ========== Batch Deposit And Call Tests ==========

    function test_DepositAndCall_WithPermit() public {
        MockERC20Permit permitToken = new MockERC20Permit("PermitToken", "PTK", 18);
        address mirrorPermitToken = makeAddr("mirrorPermitToken");
        address callContract = makeAddr("callContract");

        vm.startPrank(admin);
        _bridge.whiteListToken(address(permitToken), mirrorPermitToken, minAmount, depositLimit, claimLimit);
        _bridge.setCallContractWhitelist(callContract, true);
        _bridge.grantRole(_bridge.RELAYER_ROLE(), admin);
        vm.stopPrank();

        // Create users with private keys for signing
        uint256 user1PrivateKey = 0x1234;
        uint256 user2PrivateKey = 0x5678;
        address user1 = vm.addr(user1PrivateKey);
        address user2 = vm.addr(user2PrivateKey);

        permitToken.mint(user1, INITIAL_BALANCE);
        permitToken.mint(user2, INITIAL_BALANCE);

        // Build permit signatures for both users
        uint256 deadline = block.timestamp + 1 hours;
        bytes32 permitTypehash =
            keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
        bytes32 domainSeparator = permitToken.DOMAIN_SEPARATOR();

        // User1 permit
        bytes32 structHash1 =
            keccak256(abi.encode(permitTypehash, user1, address(_bridge), DEPOSIT_AMOUNT, 0, deadline));
        bytes32 digest1 = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash1));
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(user1PrivateKey, digest1);

        // User2 permit
        bytes32 structHash2 =
            keccak256(abi.encode(permitTypehash, user2, address(_bridge), DEPOSIT_AMOUNT, 0, deadline));
        bytes32 digest2 = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash2));
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(user2PrivateKey, digest2);

        // Create deposit params (account and amount only)
        IBridge.DepositParams[] memory deposits = new IBridge.DepositParams[](2);
        deposits[0] = IBridge.DepositParams({account: user1, amount: DEPOSIT_AMOUNT});
        deposits[1] = IBridge.DepositParams({account: user2, amount: DEPOSIT_AMOUNT});

        // Create permit params (separate array, ordered to match deposits)
        IBridge.PermitParams[] memory permits = new IBridge.PermitParams[](2);
        permits[0] = IBridge.PermitParams({deadline: deadline, v: v1, r: r1, s: s1});
        permits[1] = IBridge.PermitParams({deadline: deadline, v: v2, r: r2, s: s2});

        uint256 reserveBalance = minAmount;

        // Batch deposit
        vm.prank(admin);
        _bridge.batchDepositAndCall(address(permitToken), deposits, permits, callContract, reserveBalance);

        assertEq(permitToken.balanceOf(user1), INITIAL_BALANCE - DEPOSIT_AMOUNT);
        assertEq(permitToken.balanceOf(user2), INITIAL_BALANCE - DEPOSIT_AMOUNT);
        assertEq(permitToken.balanceOf(address(_bridge)), 2 * DEPOSIT_AMOUNT);
    }

    function test_DepositAndCall_MixedPermitAndApproval() public {
        MockERC20Permit permitToken = new MockERC20Permit("PermitToken", "PTK", 18);
        address mirrorPermitToken = makeAddr("mirrorPermitToken");
        address callContract = makeAddr("callContract");

        vm.startPrank(admin);
        _bridge.whiteListToken(address(permitToken), mirrorPermitToken, minAmount, depositLimit, claimLimit);
        _bridge.setCallContractWhitelist(callContract, true);
        _bridge.grantRole(_bridge.RELAYER_ROLE(), admin);
        vm.stopPrank();

        // Create users - user1 and user2 will use permits, user3 will use prior approval
        uint256 user1PrivateKey = 0x1234;
        uint256 user2PrivateKey = 0x5678;
        address user1 = vm.addr(user1PrivateKey);
        address user2 = vm.addr(user2PrivateKey);
        address user3 = makeAddr("user3");

        permitToken.mint(user1, INITIAL_BALANCE);
        permitToken.mint(user2, INITIAL_BALANCE);
        permitToken.mint(user3, INITIAL_BALANCE);

        // User3 approves the bridge directly (no permit)
        vm.prank(user3);
        permitToken.approve(address(_bridge), DEPOSIT_AMOUNT);

        // Build permit signatures for user1 and user2
        uint256 deadline = block.timestamp + 1 hours;
        bytes32 permitTypehash =
            keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
        bytes32 domainSeparator = permitToken.DOMAIN_SEPARATOR();

        // User1 permit
        bytes32 structHash1 =
            keccak256(abi.encode(permitTypehash, user1, address(_bridge), DEPOSIT_AMOUNT, 0, deadline));
        bytes32 digest1 = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash1));
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(user1PrivateKey, digest1);

        // User2 permit
        bytes32 structHash2 =
            keccak256(abi.encode(permitTypehash, user2, address(_bridge), DEPOSIT_AMOUNT, 0, deadline));
        bytes32 digest2 = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash2));
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(user2PrivateKey, digest2);

        // Create deposit params - deposits with permits first, then deposit without permit
        IBridge.DepositParams[] memory deposits = new IBridge.DepositParams[](3);
        deposits[0] = IBridge.DepositParams({account: user1, amount: DEPOSIT_AMOUNT});
        deposits[1] = IBridge.DepositParams({account: user2, amount: DEPOSIT_AMOUNT});
        deposits[2] = IBridge.DepositParams({account: user3, amount: DEPOSIT_AMOUNT}); // No permit, uses approval

        // Create permit params - only 2 permits for the first 2 deposits
        IBridge.PermitParams[] memory permits = new IBridge.PermitParams[](2);
        permits[0] = IBridge.PermitParams({deadline: deadline, v: v1, r: r1, s: s1});
        permits[1] = IBridge.PermitParams({deadline: deadline, v: v2, r: r2, s: s2});

        uint256 reserveBalance = minAmount;

        // Batch deposit
        vm.prank(admin);
        _bridge.batchDepositAndCall(address(permitToken), deposits, permits, callContract, reserveBalance);

        assertEq(permitToken.balanceOf(user1), INITIAL_BALANCE - DEPOSIT_AMOUNT);
        assertEq(permitToken.balanceOf(user2), INITIAL_BALANCE - DEPOSIT_AMOUNT);
        assertEq(permitToken.balanceOf(user3), INITIAL_BALANCE - DEPOSIT_AMOUNT);
        assertEq(permitToken.balanceOf(address(_bridge)), 3 * DEPOSIT_AMOUNT);
    }

    function test_DepositAndCall_RevertIfNotRelayer() public {
        MockERC20Permit permitToken = new MockERC20Permit("PermitToken", "PTK", 18);
        address mirrorPermitToken = makeAddr("mirrorPermitToken");
        address callContract = makeAddr("callContract");

        vm.startPrank(admin);
        _bridge.whiteListToken(address(permitToken), mirrorPermitToken, minAmount, depositLimit, claimLimit);
        _bridge.setCallContractWhitelist(callContract, true);
        vm.stopPrank();

        IBridge.DepositParams[] memory deposits = new IBridge.DepositParams[](1);
        deposits[0] = IBridge.DepositParams({account: user, amount: DEPOSIT_AMOUNT});

        IBridge.PermitParams[] memory permits = new IBridge.PermitParams[](0);

        // Should revert because caller doesn't have RELAYER_ROLE
        vm.prank(user);
        vm.expectRevert();
        _bridge.batchDepositAndCall(address(permitToken), deposits, permits, callContract, minAmount);
    }

    function test_DepositAndCall_RevertIfCallContractNotWhitelisted() public {
        MockERC20Permit permitToken = new MockERC20Permit("PermitToken", "PTK", 18);
        address mirrorPermitToken = makeAddr("mirrorPermitToken");
        address callContract = makeAddr("callContract");

        vm.startPrank(admin);
        _bridge.whiteListToken(address(permitToken), mirrorPermitToken, minAmount, depositLimit, claimLimit);
        _bridge.grantRole(_bridge.RELAYER_ROLE(), admin);
        // Note: NOT whitelisting callContract
        vm.stopPrank();

        IBridge.DepositParams[] memory deposits = new IBridge.DepositParams[](1);
        deposits[0] = IBridge.DepositParams({account: user, amount: DEPOSIT_AMOUNT});

        IBridge.PermitParams[] memory permits = new IBridge.PermitParams[](0);

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(IBridge.CallContractNotWhitelisted.selector));
        _bridge.batchDepositAndCall(address(permitToken), deposits, permits, callContract, minAmount);
    }

    function test_DepositAndCall_RevertIfAmountBelowReserve() public {
        MockERC20Permit permitToken = new MockERC20Permit("PermitToken", "PTK", 18);
        address mirrorPermitToken = makeAddr("mirrorPermitToken");
        address callContract = makeAddr("callContract");

        vm.startPrank(admin);
        _bridge.whiteListToken(address(permitToken), mirrorPermitToken, minAmount, depositLimit, claimLimit);
        _bridge.setCallContractWhitelist(callContract, true);
        _bridge.grantRole(_bridge.RELAYER_ROLE(), admin);
        vm.stopPrank();

        uint256 reserveBalance = DEPOSIT_AMOUNT + 1; // More than deposit amount

        IBridge.DepositParams[] memory deposits = new IBridge.DepositParams[](1);
        deposits[0] = IBridge.DepositParams({account: user, amount: DEPOSIT_AMOUNT});

        IBridge.PermitParams[] memory permits = new IBridge.PermitParams[](0);

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(IBridge.AmountBelowReserve.selector));
        _bridge.batchDepositAndCall(address(permitToken), deposits, permits, callContract, reserveBalance);
    }

    function test_DepositAndCall_RevertIfEmpty() public {
        address callContract = makeAddr("callContract");

        vm.startPrank(admin);
        _bridge.setCallContractWhitelist(callContract, true);
        _bridge.grantRole(_bridge.RELAYER_ROLE(), admin);
        vm.stopPrank();

        IBridge.DepositParams[] memory deposits = new IBridge.DepositParams[](0);
        IBridge.PermitParams[] memory permits = new IBridge.PermitParams[](0);

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(IBridge.InvalidTokenAmount.selector));
        _bridge.batchDepositAndCall(address(_token), deposits, permits, callContract, minAmount);
    }

    // ========== Batch Claim Tests ==========

    function test_BatchClaim() public {
        // Deposit enough tokens to claim multiple times
        vm.prank(admin);
        _bridge.deposit(address(_token), 3 * DEPOSIT_AMOUNT, admin, "");

        address user1 = makeAddr("user1");
        address user2 = makeAddr("user2");

        // Create proofs for two different claims
        (bytes32 txHash1, uint64 epoch1, bytes memory sigs1, bytes memory proof1) =
            createTokenClaimProof(MIRROR_TOKEN, DEPOSIT_AMOUNT, user1, 4, _bridge.DOMAIN_SEPARATOR());
        (bytes32 txHash2, uint64 epoch2, bytes memory sigs2, bytes memory proof2) =
            createTokenClaimProof(MIRROR_TOKEN, DEPOSIT_AMOUNT, user2, 4, _bridge.DOMAIN_SEPARATOR());

        // Create claim params array
        IBridge.ClaimParams[] memory claims = new IBridge.ClaimParams[](2);
        claims[0] = IBridge.ClaimParams({
            amount: DEPOSIT_AMOUNT,
            to: user1,
            committeeEpoch: epoch1,
            aggregatedSignatures: sigs1,
            proof: proof1
        });
        claims[1] = IBridge.ClaimParams({
            amount: DEPOSIT_AMOUNT,
            to: user2,
            committeeEpoch: epoch2,
            aggregatedSignatures: sigs2,
            proof: proof2
        });

        // Batch claim
        vm.expectEmit(true, true, true, true);
        emit IBridge.Claim(txHash1, address(_token), MIRROR_TOKEN, DEPOSIT_AMOUNT, user1);
        vm.expectEmit(true, true, true, true);
        emit IBridge.Claim(txHash2, address(_token), MIRROR_TOKEN, DEPOSIT_AMOUNT, user2);

        _bridge.batchClaim(address(_token), claims);

        assertEq(_token.balanceOf(user1), DEPOSIT_AMOUNT);
        assertEq(_token.balanceOf(user2), DEPOSIT_AMOUNT);
        assertEq(_token.balanceOf(address(_bridge)), DEPOSIT_AMOUNT); // 3 - 2 = 1 remaining
    }

    function test_BatchClaim_RevertIfEmpty() public {
        IBridge.ClaimParams[] memory claims = new IBridge.ClaimParams[](0);

        vm.expectRevert(abi.encodeWithSelector(IBridge.InvalidTokenAmount.selector));
        _bridge.batchClaim(address(_token), claims);
    }

    function test_BatchClaim_RevertIfAlreadyClaimed() public {
        vm.prank(admin);
        _bridge.deposit(address(_token), 2 * DEPOSIT_AMOUNT, admin, "");

        (bytes32 txHash1, uint64 epoch1, bytes memory sigs1, bytes memory proof1) =
            createTokenClaimProof(MIRROR_TOKEN, DEPOSIT_AMOUNT, user, 4, _bridge.DOMAIN_SEPARATOR());

        // First claim via single claim
        _bridge.claim(address(_token), DEPOSIT_AMOUNT, user, epoch1, sigs1, proof1);

        // Try to batch claim with the same proof
        IBridge.ClaimParams[] memory claims = new IBridge.ClaimParams[](1);
        claims[0] = IBridge.ClaimParams({
            amount: DEPOSIT_AMOUNT,
            to: user,
            committeeEpoch: epoch1,
            aggregatedSignatures: sigs1,
            proof: proof1
        });

        vm.expectRevert(abi.encodeWithSelector(IBridge.RequestAlreadyProcessed.selector));
        _bridge.batchClaim(address(_token), claims);
    }

    function test_BatchClaim_RevertIfPaused() public {
        vm.prank(admin);
        _bridge.setState(IBridge.ContractState.Paused);

        IBridge.ClaimParams[] memory claims = new IBridge.ClaimParams[](1);
        claims[0] = IBridge.ClaimParams({
            amount: DEPOSIT_AMOUNT,
            to: user,
            committeeEpoch: 0,
            aggregatedSignatures: "",
            proof: ""
        });

        vm.expectRevert(IBridge.ContractPaused.selector);
        _bridge.batchClaim(address(_token), claims);
    }
}
