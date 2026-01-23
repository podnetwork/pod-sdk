// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {BridgeClaimProofHelper} from "./abstract/BridgeClaimProofHelper.sol";
import {Bridge} from "../src/Bridge.sol";
import {IBridge} from "../src/interfaces/IBridge.sol";
import {ProofLib} from "../src/lib/ProofLib.sol";
import {WrappedToken} from "../src/WrappedToken.sol";
import {MockERC20Permit} from "./mocks/MockERC20Permit.sol";

contract BridgeTest is Test, BridgeClaimProofHelper {
    Bridge internal _bridge;
    WrappedToken internal _token;

    address public admin = makeAddr("admin");
    address public user = makeAddr("user");
    address public newBridge = makeAddr("newBridge");

    uint256 public constant INITIAL_BALANCE = 1000e18;
    uint256 public constant DEPOSIT_AMOUNT = 100e18;
    uint256 constant NUMBER_OF_VALIDATORS = 4;
    uint256 constant SRC_CHAIN_ID = 0x50d;

    uint256 public minAmount;
    uint256 public depositLimit;
    uint256 public claimLimit;

    address immutable MIRROR_TOKEN = makeAddr("mirrorToken");

    function setUp() public {
        minAmount = 1e18;
        depositLimit = 500e18;
        claimLimit = 400e18;

        vm.startPrank(admin);
        uint8 f = uint8((NUMBER_OF_VALIDATORS - 1) / 3);
        address[] memory initialValidators = new address[](NUMBER_OF_VALIDATORS);

        validatorPrivateKeys = new uint256[](NUMBER_OF_VALIDATORS);
        otherBridgeContract = makeAddr("otherBridgeContract");

        for (uint256 i = 0; i < NUMBER_OF_VALIDATORS; i++) {
            validatorPrivateKeys[i] = uint256(i + 1);
            initialValidators[i] = vm.addr(validatorPrivateKeys[i]);
        }

        _bridge = new Bridge(otherBridgeContract, initialValidators, f, SRC_CHAIN_ID, 1);

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

    function test_Deposit_EmitsEvent() public {
        vm.prank(user);
        vm.expectEmit(true, true, true, true);
        emit IBridge.Deposit(bytes32(uint256(0)), address(_token), DEPOSIT_AMOUNT, user);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, user, "");
    }

    function test_Deposit_RevertIfPaused() public {
        vm.prank(admin);
        _bridge.setState(IBridge.ContractState.Paused);
        vm.expectRevert(IBridge.ContractPaused.selector);
        vm.prank(user);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, user, "");
    }

    function test_Deposit_MinAndDailyLimit() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(IBridge.InvalidTokenAmount.selector));
        _bridge.deposit(address(_token), minAmount - 1, user, "");

        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(IBridge.DailyLimitExhausted.selector));
        _bridge.deposit(address(_token), depositLimit + 1, user, "");
    }

    function test_Deposit_ExactlyAtMinAndLimit() public {
        vm.prank(user);
        _bridge.deposit(address(_token), minAmount, user, "");
        vm.prank(user);
        _bridge.deposit(address(_token), depositLimit - minAmount, user, "");
    }

    function test_Deposit_MultipleSameDay_TracksConsumed() public {
        vm.prank(user);
        _bridge.deposit(address(_token), 100e18, user, "");
        vm.prank(user);
        _bridge.deposit(address(_token), 200e18, user, "");
        (,,, IBridge.TokenUsage memory dep,,) = _bridge.tokenData(address(_token));
        assertEq(dep.consumed, 300e18);
    }

    function test_Deposit_DailyLimitResets_AfterOneDayOnly() public {
        vm.prank(user);
        _bridge.deposit(address(_token), depositLimit, user, "");
        vm.warp(block.timestamp + 1 days - 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(IBridge.DailyLimitExhausted.selector));
        _bridge.deposit(address(_token), minAmount, user, "");
        vm.warp(block.timestamp + 2);
        vm.prank(user);
        _bridge.deposit(address(_token), depositLimit, user, "");
    }

    function test_Deposit_RevertIfTokenNotWhitelisted() public {
        address notWhitelisted = address(0xBEEF);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(IBridge.InvalidTokenConfig.selector));
        _bridge.deposit(notWhitelisted, 1, user, "");
    }

    function test_DepositIndex_IncrementsSequentially() public {
        uint256 beforeIdx = _bridge.depositIndex();
        vm.prank(user);
        _bridge.deposit(address(_token), minAmount, user, "");
        assertEq(_bridge.depositIndex(), beforeIdx + 1);

        vm.prank(user);
        _bridge.deposit(address(_token), minAmount, user, "");
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

    function test_DepositNative_NotSupported() public {
        vm.deal(user, DEPOSIT_AMOUNT);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(IBridge.InvalidTokenConfig.selector));
        _bridge.deposit(address(0), 0, user, "");
    }

    function test_Deposit_RevertAfterMigrated() public {
        vm.startPrank(admin);
        _bridge.setState(IBridge.ContractState.Paused);
        _bridge.migrate(newBridge);
        vm.stopPrank();
        vm.prank(user);
        vm.expectRevert(IBridge.ContractPaused.selector);
        _bridge.deposit(address(_token), 1, user, "");
    }

    function test_Deposit_SkipsDailyLimit_WhenDepositCapZero() public {
        vm.prank(admin);
        _bridge.configureToken(address(_token), minAmount, 0, claimLimit);

        vm.prank(user);
        vm.expectRevert();
        _bridge.deposit(address(_token), minAmount, user, "");
    }

    // ========== Claim Tests ==========

    function test_Claim() public {
        vm.prank(admin);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, admin, "");

        uint256 initialBalance = _token.balanceOf(user);
        assertEq(_token.balanceOf(address(_bridge)), DEPOSIT_AMOUNT);

        (bytes32 txHash, bytes memory aggregatedSignatures, bytes memory proof) =
            createTokenClaimProof(MIRROR_TOKEN, DEPOSIT_AMOUNT, user, 4, _bridge.domainSeperator());

        vm.expectEmit(true, true, true, true);
        emit IBridge.Claim(txHash, address(_token), MIRROR_TOKEN, DEPOSIT_AMOUNT, user);
        _bridge.claim(address(_token), DEPOSIT_AMOUNT, user, aggregatedSignatures, proof);

        assertEq(_token.balanceOf(user), initialBalance + DEPOSIT_AMOUNT);
        assertEq(_token.balanceOf(address(_bridge)), 0);

        (,,, IBridge.TokenUsage memory depositUsage, IBridge.TokenUsage memory claimUsage,) =
            _bridge.tokenData(address(_token));
        assertEq(depositUsage.consumed, DEPOSIT_AMOUNT);
        assertEq(claimUsage.consumed, DEPOSIT_AMOUNT);
    }

    function test_Claim_RevertIfNotEnoughSignatures() public {
        vm.prank(admin);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, admin, "");

        (, bytes memory aggregatedSignatures, bytes memory proof) =
            createTokenClaimProof(MIRROR_TOKEN, DEPOSIT_AMOUNT, user, 2, _bridge.domainSeperator());

        vm.expectRevert("Not enough validator weight");
        _bridge.claim(address(_token), DEPOSIT_AMOUNT, user, aggregatedSignatures, proof);
    }

    function test_Claim_RevertIfInvalidProof() public {
        vm.prank(admin);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, admin, "");

        (, bytes memory aggregatedSignatures, bytes memory proof) =
            createTokenClaimProof(MIRROR_TOKEN, DEPOSIT_AMOUNT, user, 4, _bridge.domainSeperator());

        bytes memory tamperedProof = bytes.concat(proof, abi.encode(keccak256("tamper")));

        vm.expectRevert();
        _bridge.claim(address(_token), DEPOSIT_AMOUNT, user, aggregatedSignatures, tamperedProof);
    }

    function test_Claim_RevertIfAlreadyClaimed() public {
        vm.prank(admin);
        _bridge.deposit(address(_token), 2 * DEPOSIT_AMOUNT, admin, "");

        (bytes32 txHash, bytes memory aggregatedSignatures, bytes memory proof) =
            createTokenClaimProof(MIRROR_TOKEN, DEPOSIT_AMOUNT, user, 4, _bridge.domainSeperator());

        vm.expectEmit(true, true, true, true);
        emit IBridge.Claim(txHash, address(_token), MIRROR_TOKEN, DEPOSIT_AMOUNT, user);
        _bridge.claim(address(_token), DEPOSIT_AMOUNT, user, aggregatedSignatures, proof);

        vm.expectRevert(abi.encodeWithSelector(IBridge.RequestAlreadyProcessed.selector));
        _bridge.claim(address(_token), DEPOSIT_AMOUNT, user, aggregatedSignatures, proof);
    }

    function test_Claim_RevertIfTokenNotWhitelisted() public {
        address unknownToken = makeAddr("unknownToken");
        (, bytes memory aggregatedSignatures, bytes memory proof) =
            createTokenClaimProof(unknownToken, DEPOSIT_AMOUNT, user, 3, _bridge.domainSeperator());

        vm.expectRevert(abi.encodeWithSelector(IBridge.InvalidTokenConfig.selector));
        _bridge.claim(unknownToken, DEPOSIT_AMOUNT, user, aggregatedSignatures, proof);
    }

    function test_Claim_RevertIfPaused() public {
        vm.prank(admin);
        _bridge.setState(IBridge.ContractState.Paused);

        (, bytes memory aggregatedSignatures, bytes memory proof) =
            createTokenClaimProof(MIRROR_TOKEN, DEPOSIT_AMOUNT, user, 3, _bridge.domainSeperator());

        vm.expectRevert(IBridge.ContractPaused.selector);
        _bridge.claim(address(_token), DEPOSIT_AMOUNT, user, aggregatedSignatures, proof);
    }

    function test_Claim_RevertIfInvalidAmount() public {
        vm.prank(admin);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, admin, "");

        (, bytes memory aggregatedSignatures, bytes memory proof) =
            createTokenClaimProof(MIRROR_TOKEN, minAmount - 1, user, 3, _bridge.domainSeperator());

        vm.expectRevert(abi.encodeWithSelector(IBridge.InvalidTokenAmount.selector));
        _bridge.claim(address(_token), minAmount - 1, user, aggregatedSignatures, proof);
    }

    // ========== Batch Claim Tests ==========

    function test_BatchClaim() public {
        vm.prank(admin);
        _bridge.deposit(address(_token), 3 * DEPOSIT_AMOUNT, admin, "");

        address user1 = makeAddr("user1");
        address user2 = makeAddr("user2");

        (bytes32 txHash1, bytes memory sigs1, bytes memory proof1) =
            createTokenClaimProof(MIRROR_TOKEN, DEPOSIT_AMOUNT, user1, 4, _bridge.domainSeperator());
        (bytes32 txHash2, bytes memory sigs2, bytes memory proof2) =
            createTokenClaimProof(MIRROR_TOKEN, DEPOSIT_AMOUNT, user2, 4, _bridge.domainSeperator());

        IBridge.ClaimParams[] memory claims = new IBridge.ClaimParams[](2);
        claims[0] = IBridge.ClaimParams({amount: DEPOSIT_AMOUNT, to: user1, aggregatedSignatures: sigs1, proof: proof1});
        claims[1] = IBridge.ClaimParams({amount: DEPOSIT_AMOUNT, to: user2, aggregatedSignatures: sigs2, proof: proof2});

        vm.expectEmit(true, true, true, true);
        emit IBridge.Claim(txHash1, address(_token), MIRROR_TOKEN, DEPOSIT_AMOUNT, user1);
        vm.expectEmit(true, true, true, true);
        emit IBridge.Claim(txHash2, address(_token), MIRROR_TOKEN, DEPOSIT_AMOUNT, user2);

        _bridge.batchClaim(address(_token), claims);

        assertEq(_token.balanceOf(user1), DEPOSIT_AMOUNT);
        assertEq(_token.balanceOf(user2), DEPOSIT_AMOUNT);
        assertEq(_token.balanceOf(address(_bridge)), DEPOSIT_AMOUNT);
    }

    function test_BatchClaim_RevertIfEmpty() public {
        IBridge.ClaimParams[] memory claims = new IBridge.ClaimParams[](0);
        vm.expectRevert(abi.encodeWithSelector(IBridge.InvalidTokenAmount.selector));
        _bridge.batchClaim(address(_token), claims);
    }

    function test_BatchClaim_RevertIfAlreadyClaimed() public {
        vm.prank(admin);
        _bridge.deposit(address(_token), 2 * DEPOSIT_AMOUNT, admin, "");

        (, bytes memory sigs1, bytes memory proof1) =
            createTokenClaimProof(MIRROR_TOKEN, DEPOSIT_AMOUNT, user, 4, _bridge.domainSeperator());

        _bridge.claim(address(_token), DEPOSIT_AMOUNT, user, sigs1, proof1);

        IBridge.ClaimParams[] memory claims = new IBridge.ClaimParams[](1);
        claims[0] = IBridge.ClaimParams({amount: DEPOSIT_AMOUNT, to: user, aggregatedSignatures: sigs1, proof: proof1});

        vm.expectRevert(abi.encodeWithSelector(IBridge.RequestAlreadyProcessed.selector));
        _bridge.batchClaim(address(_token), claims);
    }

    function test_BatchClaim_RevertIfPaused() public {
        vm.prank(admin);
        _bridge.setState(IBridge.ContractState.Paused);

        IBridge.ClaimParams[] memory claims = new IBridge.ClaimParams[](1);
        claims[0] = IBridge.ClaimParams({amount: DEPOSIT_AMOUNT, to: user, aggregatedSignatures: "", proof: ""});

        vm.expectRevert(IBridge.ContractPaused.selector);
        _bridge.batchClaim(address(_token), claims);
    }

    // ========== Token Configuration Tests ==========

    function test_ConfigureToken() public {
        uint256 newMin = 2e18;
        uint256 newDeposit = 2000e18;
        uint256 newClaim = 2000e18;
        vm.prank(admin);
        _bridge.configureToken(address(_token), newMin, newDeposit, newClaim);
        (uint256 tokenMinAmount, uint256 tokenDepositLimit, uint256 tokenClaimLimit,,,) =
            _bridge.tokenData(address(_token));
        assertEq(tokenMinAmount, newMin);
        assertEq(tokenDepositLimit, newDeposit);
        assertEq(tokenClaimLimit, newClaim);
    }

    function test_ConfigureToken_RevertIfNotAdmin() public {
        vm.prank(user);
        vm.expectRevert();
        _bridge.configureToken(address(_token), 2e18, 2000e18, 2000e18);
    }

    function test_ConfigureToken_RevertIfUpdatingUnconfiguredToken() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(IBridge.InvalidTokenConfig.selector));
        _bridge.configureToken(address(0xCAFE), 1, 1, 1);
    }

    function test_ConfigureToken_ResetsDailyLimits() public {
        vm.prank(user);
        _bridge.deposit(address(_token), minAmount, user, "");
        (,,, IBridge.TokenUsage memory dep,,) = _bridge.tokenData(address(_token));
        assertEq(dep.consumed, minAmount);
        vm.prank(admin);
        _bridge.configureToken(address(_token), minAmount, depositLimit, claimLimit);
        (,,, IBridge.TokenUsage memory dep2,,) = _bridge.tokenData(address(_token));
        assertEq(dep2.consumed, 0);
        vm.prank(user);
        _bridge.deposit(address(_token), minAmount, user, "");
    }

    function test_ConfigureToken_DisableToken() public {
        vm.prank(user);
        _bridge.deposit(address(_token), minAmount, user, "");
        vm.prank(admin);
        _bridge.configureToken(address(_token), 1e18, 0, 0);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(IBridge.DailyLimitExhausted.selector));
        _bridge.deposit(address(_token), minAmount, user, "");
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

    function test_WhiteListToken_RevertAfterMigrated() public {
        vm.startPrank(admin);
        _bridge.setState(IBridge.ContractState.Paused);
        _bridge.migrate(newBridge);
        vm.expectRevert(abi.encodeWithSelector(IBridge.ContractMigrated.selector));
        _bridge.whiteListToken(address(0x1234), address(0x5678), 1, 100, 100);
        vm.stopPrank();
    }

    function test_MultiToken_DepositTracksUsageSeparately() public {
        address t2 = address(0xB0B2);
        WrappedToken t2Mock = new WrappedToken("Token", "TKN", 18);
        vm.prank(admin);
        _bridge.whiteListToken(t2, address(t2Mock), minAmount, depositLimit, claimLimit);

        vm.prank(user);
        _bridge.deposit(address(_token), minAmount, user, "");
        (,,, IBridge.TokenUsage memory dep1,,) = _bridge.tokenData(address(_token));
        assertEq(dep1.consumed, minAmount);

        (,,, IBridge.TokenUsage memory dep2,,) = _bridge.tokenData(t2);
        assertEq(dep2.consumed, 0);
    }

    // ========== Pause/State Tests ==========

    function test_Pause_Unpause() public {
        vm.prank(admin);
        _bridge.setState(IBridge.ContractState.Paused);
        assertEq(uint256(_bridge.contractState()), uint256(IBridge.ContractState.Paused));
        vm.prank(admin);
        _bridge.setState(IBridge.ContractState.Public);
        assertEq(uint256(_bridge.contractState()), uint256(IBridge.ContractState.Public));
    }

    function test_Pause_RevertIfNotPauseRole() public {
        vm.prank(user);
        vm.expectRevert();
        _bridge.setState(IBridge.ContractState.Paused);
    }

    function test_Pause_RoleRequired_Unpause_AdminRequired() public {
        vm.prank(user);
        vm.expectRevert();
        _bridge.setState(IBridge.ContractState.Paused);
        vm.prank(admin);
        _bridge.setState(IBridge.ContractState.Paused);
        vm.prank(user);
        vm.expectRevert();
        _bridge.setState(IBridge.ContractState.Public);
    }

    function test_RoleGrants_FromConstructor() public view {
        assertTrue(_bridge.hasRole(_bridge.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(_bridge.hasRole(_bridge.PAUSER_ROLE(), admin));
    }

    // ========== Migration Tests ==========

    function test_Migrate_SetsMigratedContract() public {
        vm.prank(admin);
        _bridge.setState(IBridge.ContractState.Paused);
        vm.prank(admin);
        _bridge.migrate(newBridge);
        assertEq(_bridge.migratedContract(), newBridge);
    }

    function test_Migrate_RevertIfAlreadyMigrated() public {
        vm.startPrank(admin);
        _bridge.setState(IBridge.ContractState.Paused);
        _bridge.migrate(newBridge);
        vm.expectRevert(abi.encodeWithSelector(IBridge.ContractMigrated.selector));
        _bridge.migrate(address(0x1234));
        vm.stopPrank();
    }

    function test_Migrate_TransfersAllTokenBalances() public {
        vm.prank(user);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, user, "");
        vm.startPrank(admin);
        _bridge.setState(IBridge.ContractState.Paused);
        uint256 beforeAmt = _token.balanceOf(address(_bridge));
        _bridge.migrate(newBridge);

        assertEq(_token.balanceOf(newBridge), 0);
        assertEq(_token.balanceOf(address(_bridge)), beforeAmt);

        address[] memory tokens = new address[](1);
        tokens[0] = address(_token);
        _bridge.transferTokensToMigrated(tokens);
        vm.stopPrank();

        assertEq(_token.balanceOf(newBridge), beforeAmt);
        assertEq(_token.balanceOf(address(_bridge)), 0);
    }

    function test_Migrate_NoWhitelistedTokens() public {
        vm.prank(admin);
        address[] memory validators = new address[](NUMBER_OF_VALIDATORS);
        for (uint256 i = 0; i < NUMBER_OF_VALIDATORS; i++) {
            validators[i] = vm.addr(uint256(i + 1));
        }
        Bridge fresh = new Bridge(otherBridgeContract, validators, 1, SRC_CHAIN_ID, 1);
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

        address[] memory tokens = new address[](2);
        tokens[0] = address(_token);
        tokens[1] = address(t2);
        _bridge.transferTokensToMigrated(tokens);
        vm.stopPrank();

        assertEq(_token.balanceOf(newBridge), DEPOSIT_AMOUNT);
        assertEq(t2.balanceOf(newBridge), 0);
    }

    function test_TransferTokensToMigrated_CanBeCalledMultipleTimes() public {
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

        address[] memory tokens1 = new address[](1);
        tokens1[0] = address(_token);
        _bridge.transferTokensToMigrated(tokens1);

        assertEq(_token.balanceOf(newBridge), DEPOSIT_AMOUNT);
        assertEq(t2.balanceOf(newBridge), 0);

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

    // ========== Permit Tests ==========

    function test_Deposit_WithPermit() public {
        MockERC20Permit permitToken = new MockERC20Permit("PermitToken", "PTK", 18);
        address mirrorPermitToken = makeAddr("mirrorPermitToken");

        vm.prank(admin);
        _bridge.whiteListToken(address(permitToken), mirrorPermitToken, minAmount, depositLimit, claimLimit);

        uint256 userPrivateKey = 0x1234;
        address permitUser = vm.addr(userPrivateKey);
        permitToken.mint(permitUser, INITIAL_BALANCE);

        uint256 deadline = block.timestamp + 1 hours;
        bytes32 permitTypehash =
            keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
        bytes32 domainSeparator = permitToken.DOMAIN_SEPARATOR();

        bytes32 structHash =
            keccak256(abi.encode(permitTypehash, permitUser, address(_bridge), DEPOSIT_AMOUNT, 0, deadline));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, digest);

        bytes memory permit = abi.encodePacked(deadline, v, r, s);

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

        vm.prank(permitUser);
        vm.expectRevert();
        _bridge.deposit(address(permitToken), DEPOSIT_AMOUNT, permitUser, "");

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

        uint256 user1PrivateKey = 0x1234;
        uint256 user2PrivateKey = 0x5678;
        address user1 = vm.addr(user1PrivateKey);
        address user2 = vm.addr(user2PrivateKey);

        permitToken.mint(user1, INITIAL_BALANCE);
        permitToken.mint(user2, INITIAL_BALANCE);

        uint256 deadline = block.timestamp + 1 hours;
        bytes32 permitTypehash =
            keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
        bytes32 domainSeparator = permitToken.DOMAIN_SEPARATOR();

        bytes32 structHash1 =
            keccak256(abi.encode(permitTypehash, user1, address(_bridge), DEPOSIT_AMOUNT, 0, deadline));
        bytes32 digest1 = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash1));
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(user1PrivateKey, digest1);

        bytes32 structHash2 =
            keccak256(abi.encode(permitTypehash, user2, address(_bridge), DEPOSIT_AMOUNT, 0, deadline));
        bytes32 digest2 = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash2));
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(user2PrivateKey, digest2);

        IBridge.DepositParams[] memory deposits = new IBridge.DepositParams[](2);
        deposits[0] = IBridge.DepositParams({account: user1, amount: DEPOSIT_AMOUNT});
        deposits[1] = IBridge.DepositParams({account: user2, amount: DEPOSIT_AMOUNT});

        IBridge.PermitParams[] memory permits = new IBridge.PermitParams[](2);
        permits[0] = IBridge.PermitParams({deadline: deadline, v: v1, r: r1, s: s1});
        permits[1] = IBridge.PermitParams({deadline: deadline, v: v2, r: r2, s: s2});

        vm.prank(admin);
        _bridge.batchDepositAndCall(address(permitToken), deposits, permits, callContract, minAmount);

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

        uint256 user1PrivateKey = 0x1234;
        uint256 user2PrivateKey = 0x5678;
        address user1 = vm.addr(user1PrivateKey);
        address user2 = vm.addr(user2PrivateKey);
        address user3 = makeAddr("user3");

        permitToken.mint(user1, INITIAL_BALANCE);
        permitToken.mint(user2, INITIAL_BALANCE);
        permitToken.mint(user3, INITIAL_BALANCE);

        vm.prank(user3);
        permitToken.approve(address(_bridge), DEPOSIT_AMOUNT);

        uint256 deadline = block.timestamp + 1 hours;
        bytes32 permitTypehash =
            keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
        bytes32 domainSeparator = permitToken.DOMAIN_SEPARATOR();

        bytes32 structHash1 =
            keccak256(abi.encode(permitTypehash, user1, address(_bridge), DEPOSIT_AMOUNT, 0, deadline));
        bytes32 digest1 = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash1));
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(user1PrivateKey, digest1);

        bytes32 structHash2 =
            keccak256(abi.encode(permitTypehash, user2, address(_bridge), DEPOSIT_AMOUNT, 0, deadline));
        bytes32 digest2 = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash2));
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(user2PrivateKey, digest2);

        IBridge.DepositParams[] memory deposits = new IBridge.DepositParams[](3);
        deposits[0] = IBridge.DepositParams({account: user1, amount: DEPOSIT_AMOUNT});
        deposits[1] = IBridge.DepositParams({account: user2, amount: DEPOSIT_AMOUNT});
        deposits[2] = IBridge.DepositParams({account: user3, amount: DEPOSIT_AMOUNT});

        IBridge.PermitParams[] memory permits = new IBridge.PermitParams[](2);
        permits[0] = IBridge.PermitParams({deadline: deadline, v: v1, r: r1, s: s1});
        permits[1] = IBridge.PermitParams({deadline: deadline, v: v2, r: r2, s: s2});

        vm.prank(admin);
        _bridge.batchDepositAndCall(address(permitToken), deposits, permits, callContract, minAmount);

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

        IBridge.DepositParams[] memory deposits = new IBridge.DepositParams[](1);
        deposits[0] = IBridge.DepositParams({account: user, amount: DEPOSIT_AMOUNT});

        IBridge.PermitParams[] memory permits = new IBridge.PermitParams[](0);

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(IBridge.AmountBelowReserve.selector));
        _bridge.batchDepositAndCall(address(permitToken), deposits, permits, callContract, DEPOSIT_AMOUNT + 1);
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

    // ========== Validator Management Tests ==========

    function test_ValidatorInitialization() public view {
        for (uint256 i = 0; i < NUMBER_OF_VALIDATORS; i++) {
            assertTrue(_bridge.activeValidators(vm.addr(validatorPrivateKeys[i])));
        }
        assertEq(_bridge.validatorCount(), NUMBER_OF_VALIDATORS);
        assertEq(_bridge.adversarialResilience(), (NUMBER_OF_VALIDATORS - 1) / 3);
        assertTrue(_bridge.domainSeperator() != bytes32(0));
    }

    function test_UpdateValidatorConfig_AddValidator() public {
        address newValidator = makeAddr("newValidator");
        address[] memory addValidators = new address[](1);
        addValidators[0] = newValidator;
        address[] memory removeValidators = new address[](0);

        vm.prank(admin);
        vm.expectEmit(true, false, false, true);
        emit IBridge.ValidatorAdded(newValidator);
        _bridge.updateValidatorConfig(1, 1, addValidators, removeValidators);

        assertTrue(_bridge.activeValidators(newValidator));
        assertEq(_bridge.validatorCount(), NUMBER_OF_VALIDATORS + 1);
    }

    function test_UpdateValidatorConfig_RemoveValidator() public {
        address validatorToRemove = vm.addr(validatorPrivateKeys[0]);
        address[] memory addValidators = new address[](0);
        address[] memory removeValidators = new address[](1);
        removeValidators[0] = validatorToRemove;

        vm.prank(admin);
        vm.expectEmit(true, false, false, true);
        emit IBridge.ValidatorRemoved(validatorToRemove);
        _bridge.updateValidatorConfig(1, 1, addValidators, removeValidators);

        assertFalse(_bridge.activeValidators(validatorToRemove));
        assertEq(_bridge.validatorCount(), NUMBER_OF_VALIDATORS - 1);
    }

    function test_UpdateValidatorConfig_AddAndRemove() public {
        address newValidator = makeAddr("newValidator");
        address validatorToRemove = vm.addr(validatorPrivateKeys[0]);

        address[] memory addValidators = new address[](1);
        addValidators[0] = newValidator;
        address[] memory removeValidators = new address[](1);
        removeValidators[0] = validatorToRemove;

        vm.prank(admin);
        _bridge.updateValidatorConfig(1, 1, addValidators, removeValidators);

        assertFalse(_bridge.activeValidators(validatorToRemove));
        assertTrue(_bridge.activeValidators(newValidator));
        assertEq(_bridge.validatorCount(), NUMBER_OF_VALIDATORS);
    }

    function test_UpdateValidatorConfig_RevertIfNotAdmin() public {
        address newValidator = makeAddr("newValidator");
        address[] memory addValidators = new address[](1);
        addValidators[0] = newValidator;
        address[] memory removeValidators = new address[](0);

        vm.prank(user);
        vm.expectRevert();
        _bridge.updateValidatorConfig(1, 1, addValidators, removeValidators);
    }

    function test_UpdateValidatorConfig_RevertIfZeroAddress() public {
        address[] memory addValidators = new address[](1);
        addValidators[0] = address(0);
        address[] memory removeValidators = new address[](0);

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(IBridge.ValidatorIsZeroAddress.selector));
        _bridge.updateValidatorConfig(1, 1, addValidators, removeValidators);
    }

    function test_UpdateValidatorConfig_RevertIfDuplicate() public {
        address existingValidator = vm.addr(validatorPrivateKeys[0]);
        address[] memory addValidators = new address[](1);
        addValidators[0] = existingValidator;
        address[] memory removeValidators = new address[](0);

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(IBridge.DuplicateValidator.selector));
        _bridge.updateValidatorConfig(1, 1, addValidators, removeValidators);
    }

    function test_UpdateValidatorConfig_RevertIfValidatorDoesNotExist() public {
        address nonExistentValidator = makeAddr("nonExistent");
        address[] memory addValidators = new address[](0);
        address[] memory removeValidators = new address[](1);
        removeValidators[0] = nonExistentValidator;

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(IBridge.ValidatorDoesNotExist.selector));
        _bridge.updateValidatorConfig(1, 1, addValidators, removeValidators);
    }

    function test_UpdateValidatorConfig_RevertIfInvalidResilience() public {
        address[] memory addValidators = new address[](0);
        address[] memory removeValidators = new address[](0);

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(IBridge.InvalidAdverserialResilience.selector));
        _bridge.updateValidatorConfig(0, 1, addValidators, removeValidators);

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(IBridge.InvalidAdverserialResilience.selector));
        // forge-lint: disable-next-line(unsafe-typecast)
        _bridge.updateValidatorConfig(uint64(NUMBER_OF_VALIDATORS + 1), 1, addValidators, removeValidators);
    }

    function test_ComputeTxWeight_RevertIfSignatureOrderInvalid() public {
        vm.prank(admin);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, admin, "");

        // Get the correct txHash that will be computed during claim
        bytes32 domainSep = _bridge.domainSeperator();
        bytes4 selector = bytes4(keccak256("deposit(address,uint256,address)"));
        bytes32 dataHash = keccak256(abi.encodePacked(
            selector,
            uint256(uint160(MIRROR_TOKEN)),
            DEPOSIT_AMOUNT,
            uint256(uint160(user))
        ));
        bytes32 txHash = keccak256(abi.encodePacked(
            domainSep,
            bytes32(uint256(uint160(otherBridgeContract))),
            dataHash
        ));

        // Create signatures in wrong order (descending by address)
        address[] memory signers = new address[](2);
        uint256[] memory keys = new uint256[](2);
        signers[0] = vm.addr(validatorPrivateKeys[0]);
        signers[1] = vm.addr(validatorPrivateKeys[1]);
        keys[0] = validatorPrivateKeys[0];
        keys[1] = validatorPrivateKeys[1];

        // Sort descending (wrong order)
        if (signers[0] < signers[1]) {
            (signers[0], signers[1]) = (signers[1], signers[0]);
            (keys[0], keys[1]) = (keys[1], keys[0]);
        }

        bytes memory aggregatedSignatures;
        for (uint256 i = 0; i < 2; i++) {
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(keys[i], txHash);
            aggregatedSignatures = abi.encodePacked(aggregatedSignatures, r, s, v);
        }

        vm.expectRevert(abi.encodeWithSelector(ProofLib.InvalidSignatureOrder.selector));
        _bridge.claim(address(_token), DEPOSIT_AMOUNT, user, aggregatedSignatures, "");
    }

    function test_ComputeTxWeight_RevertIfSignerNotActive() public {
        vm.prank(admin);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, admin, "");

        // Use a non-validator private key
        uint256 nonValidatorKey = 0xDEAD;

        // Create claim proof with signatures from non-validators
        bytes32 txHash = keccak256("test");
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(nonValidatorKey, txHash);
        bytes memory aggregatedSignatures = abi.encodePacked(r, s, v);

        (, , bytes memory proof) =
            createTokenClaimProof(MIRROR_TOKEN, DEPOSIT_AMOUNT, user, 4, _bridge.domainSeperator());

        vm.expectRevert(abi.encodeWithSelector(ProofLib.SignerNotActiveValidator.selector));
        _bridge.claim(address(_token), DEPOSIT_AMOUNT, user, aggregatedSignatures, proof);
    }
}
