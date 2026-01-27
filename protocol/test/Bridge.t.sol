// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {BridgeClaimProofHelper} from "./abstract/BridgeClaimProofHelper.sol";
import {Bridge} from "../src/Bridge.sol";
import {ProofLib} from "../src/lib/ProofLib.sol";
import {WrappedToken} from "../src/WrappedToken.sol";
import {MockERC20Permit} from "./mocks/MockERC20Permit.sol";
import {BridgeDeployer} from "../script/DeployBridge.s.sol";

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

        (_bridge,) =
            BridgeDeployer.deploy(otherBridgeContract, SRC_CHAIN_ID, admin, initialValidators, f, 1, bytes32(0));

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
        emit Bridge.Deposit(0, user, user, address(_token), DEPOSIT_AMOUNT);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, user, "");
    }

    function test_Deposit_RevertIfPaused() public {
        vm.prank(admin);
        _bridge.setState(Bridge.ContractState.Paused);
        vm.expectRevert(Bridge.ContractPaused.selector);
        vm.prank(user);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, user, "");
    }

    function test_Deposit_MinAndDailyLimit() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(Bridge.InvalidTokenAmount.selector));
        _bridge.deposit(address(_token), minAmount - 1, user, "");

        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(Bridge.DailyLimitExhausted.selector));
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
        (,,, Bridge.TokenUsage memory dep,,) = _bridge.tokenData(address(_token));
        assertEq(dep.consumed, 300e18);
    }

    function test_Deposit_DailyLimitResets_AfterOneDayOnly() public {
        vm.prank(user);
        _bridge.deposit(address(_token), depositLimit, user, "");
        vm.warp(block.timestamp + 1 days - 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(Bridge.DailyLimitExhausted.selector));
        _bridge.deposit(address(_token), minAmount, user, "");
        vm.warp(block.timestamp + 2);
        vm.prank(user);
        _bridge.deposit(address(_token), depositLimit, user, "");
    }

    function test_Deposit_SplittingDoesNotReduceUsage() public {
        // Test that splitting a deposit across a period reset doesn't result in lower usage
        // Scenario: limit=500, consumed=400, deposit=200
        // Old behavior: reset, consumed=200 (lost 100 remaining capacity)
        // New behavior: fill 100 remaining, reset, consumed=100

        // First consume most of the limit
        vm.prank(user);
        _bridge.deposit(address(_token), 400e18, user, "");

        // Warp past the reset period
        vm.warp(block.timestamp + 1 days + 1);

        // Now deposit 200 which exceeds remaining capacity (100)
        vm.prank(user);
        _bridge.deposit(address(_token), 200e18, user, "");

        // The excess should be 200 - 100 = 100 (not the full 200)
        // Verify by checking we can still deposit up to (limit - 100 = 400)
        vm.prank(user);
        _bridge.deposit(address(_token), 400e18, user, "");

        // But not more
        vm.prank(user);
        vm.expectRevert(Bridge.DailyLimitExhausted.selector);
        _bridge.deposit(address(_token), minAmount, user, "");
    }

    function test_Deposit_ExcessMustFitInNewPeriod() public {
        // Test that if excess exceeds the limit, the deposit is rejected
        // Scenario: limit=500, consumed=400, deposit=600
        // Remaining=100, excess=500, which equals limit (should succeed)

        vm.prank(user);
        _bridge.deposit(address(_token), 400e18, user, "");

        vm.warp(block.timestamp + 1 days + 1);

        // Deposit that uses remaining (100) + full new period (500) = 600
        vm.prank(user);
        _bridge.deposit(address(_token), 600e18, user, "");

        // Now the new period is fully consumed, can't deposit more
        vm.prank(user);
        vm.expectRevert(Bridge.DailyLimitExhausted.selector);
        _bridge.deposit(address(_token), minAmount, user, "");
    }

    function test_Deposit_RevertIfExcessExceedsLimit() public {
        // Test that if excess exceeds the limit, the deposit is rejected
        // Scenario: limit=500, consumed=400, deposit=601
        // Remaining=100, excess=501 > 500, should revert

        vm.prank(user);
        _bridge.deposit(address(_token), 400e18, user, "");

        vm.warp(block.timestamp + 1 days + 1);

        // Deposit that would require excess > limit
        vm.prank(user);
        vm.expectRevert(Bridge.DailyLimitExhausted.selector);
        _bridge.deposit(address(_token), 601e18, user, "");
    }

    function test_Deposit_RevertIfTokenNotWhitelisted() public {
        address notWhitelisted = address(0xBEEF);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(Bridge.InvalidTokenConfig.selector));
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
        vm.expectRevert(abi.encodeWithSelector(Bridge.InvalidTokenConfig.selector));
        _bridge.deposit(address(0), 0, user, "");
    }

    function test_Deposit_RevertAfterMigrated() public {
        vm.startPrank(admin);
        _bridge.setState(Bridge.ContractState.Paused);
        _bridge.migrate(newBridge);
        vm.stopPrank();
        vm.prank(user);
        vm.expectRevert(Bridge.ContractPaused.selector);
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

        (bytes32 txHash, bytes memory proof, bytes memory auxTxSuffix) =
            createTokenClaimProof(MIRROR_TOKEN, DEPOSIT_AMOUNT, user, 4, _bridge.domainSeparator());

        vm.expectEmit(true, true, true, true);
        emit Bridge.Claim(txHash, address(_token), MIRROR_TOKEN, DEPOSIT_AMOUNT, user);
        _bridge.claim(address(_token), DEPOSIT_AMOUNT, user, proof, auxTxSuffix);

        assertEq(_token.balanceOf(user), initialBalance + DEPOSIT_AMOUNT);
        assertEq(_token.balanceOf(address(_bridge)), 0);

        (,,, Bridge.TokenUsage memory depositUsage, Bridge.TokenUsage memory claimUsage,) =
            _bridge.tokenData(address(_token));
        assertEq(depositUsage.consumed, DEPOSIT_AMOUNT);
        assertEq(claimUsage.consumed, DEPOSIT_AMOUNT);
    }

    function test_Claim_RevertIfNotEnoughSignatures() public {
        vm.prank(admin);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, admin, "");

        (, bytes memory proof, bytes memory auxTxSuffix) =
            createTokenClaimProof(MIRROR_TOKEN, DEPOSIT_AMOUNT, user, 2, _bridge.domainSeparator());

        vm.expectRevert(abi.encodeWithSelector(Bridge.InsufficientValidatorWeight.selector));
        _bridge.claim(address(_token), DEPOSIT_AMOUNT, user, proof, auxTxSuffix);
    }

    function test_Claim_RevertIfInvalidProof() public {
        vm.prank(admin);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, admin, "");

        (, bytes memory proof, bytes memory auxTxSuffix) =
            createTokenClaimProof(MIRROR_TOKEN, DEPOSIT_AMOUNT, user, 4, _bridge.domainSeparator());

        bytes memory tamperedAuxTxSuffix = bytes.concat(auxTxSuffix, abi.encode(keccak256("tamper")));

        vm.expectRevert();
        _bridge.claim(address(_token), DEPOSIT_AMOUNT, user, proof, tamperedAuxTxSuffix);
    }

    function test_Claim_RevertIfAlreadyClaimed() public {
        vm.prank(admin);
        _bridge.deposit(address(_token), 2 * DEPOSIT_AMOUNT, admin, "");

        (bytes32 txHash, bytes memory proof, bytes memory auxTxSuffix) =
            createTokenClaimProof(MIRROR_TOKEN, DEPOSIT_AMOUNT, user, 4, _bridge.domainSeparator());

        vm.expectEmit(true, true, true, true);
        emit Bridge.Claim(txHash, address(_token), MIRROR_TOKEN, DEPOSIT_AMOUNT, user);
        _bridge.claim(address(_token), DEPOSIT_AMOUNT, user, proof, auxTxSuffix);

        vm.expectRevert(abi.encodeWithSelector(Bridge.RequestAlreadyProcessed.selector));
        _bridge.claim(address(_token), DEPOSIT_AMOUNT, user, proof, auxTxSuffix);
    }

    function test_Claim_RevertIfTokenNotWhitelisted() public {
        address unknownToken = makeAddr("unknownToken");
        (, bytes memory proof, bytes memory auxTxSuffix) =
            createTokenClaimProof(unknownToken, DEPOSIT_AMOUNT, user, 3, _bridge.domainSeparator());

        vm.expectRevert(abi.encodeWithSelector(Bridge.InvalidTokenConfig.selector));
        _bridge.claim(unknownToken, DEPOSIT_AMOUNT, user, proof, auxTxSuffix);
    }

    function test_Claim_RevertIfPaused() public {
        vm.prank(admin);
        _bridge.setState(Bridge.ContractState.Paused);

        (, bytes memory proof, bytes memory auxTxSuffix) =
            createTokenClaimProof(MIRROR_TOKEN, DEPOSIT_AMOUNT, user, 3, _bridge.domainSeparator());

        vm.expectRevert(Bridge.ContractPaused.selector);
        _bridge.claim(address(_token), DEPOSIT_AMOUNT, user, proof, auxTxSuffix);
    }

    function test_Claim_RevertIfInvalidAmount() public {
        vm.prank(admin);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, admin, "");

        (, bytes memory proof, bytes memory auxTxSuffix) =
            createTokenClaimProof(MIRROR_TOKEN, minAmount - 1, user, 3, _bridge.domainSeparator());

        vm.expectRevert(abi.encodeWithSelector(Bridge.InvalidTokenAmount.selector));
        _bridge.claim(address(_token), minAmount - 1, user, proof, auxTxSuffix);
    }

    // ========== Batch Claim Tests ==========

    function test_BatchClaim() public {
        vm.prank(admin);
        _bridge.deposit(address(_token), 3 * DEPOSIT_AMOUNT, admin, "");

        address user1 = makeAddr("user1");
        address user2 = makeAddr("user2");

        (bytes32 txHash1, bytes memory proof1, bytes memory auxTxSuffix1) =
            createTokenClaimProof(MIRROR_TOKEN, DEPOSIT_AMOUNT, user1, 4, _bridge.domainSeparator());
        (bytes32 txHash2, bytes memory proof2, bytes memory auxTxSuffix2) =
            createTokenClaimProof(MIRROR_TOKEN, DEPOSIT_AMOUNT, user2, 4, _bridge.domainSeparator());

        Bridge.ClaimParams[] memory claims = new Bridge.ClaimParams[](2);
        claims[0] = Bridge.ClaimParams({amount: DEPOSIT_AMOUNT, to: user1, proof: proof1, auxTxSuffix: auxTxSuffix1});
        claims[1] = Bridge.ClaimParams({amount: DEPOSIT_AMOUNT, to: user2, proof: proof2, auxTxSuffix: auxTxSuffix2});

        vm.expectEmit(true, true, true, true);
        emit Bridge.Claim(txHash1, address(_token), MIRROR_TOKEN, DEPOSIT_AMOUNT, user1);
        vm.expectEmit(true, true, true, true);
        emit Bridge.Claim(txHash2, address(_token), MIRROR_TOKEN, DEPOSIT_AMOUNT, user2);

        _bridge.batchClaim(address(_token), claims);

        assertEq(_token.balanceOf(user1), DEPOSIT_AMOUNT);
        assertEq(_token.balanceOf(user2), DEPOSIT_AMOUNT);
        assertEq(_token.balanceOf(address(_bridge)), DEPOSIT_AMOUNT);
    }

    function test_BatchClaim_RevertIfEmpty() public {
        Bridge.ClaimParams[] memory claims = new Bridge.ClaimParams[](0);
        vm.expectRevert(abi.encodeWithSelector(Bridge.InvalidTokenAmount.selector));
        _bridge.batchClaim(address(_token), claims);
    }

    function test_BatchClaim_RevertIfAlreadyClaimed() public {
        vm.prank(admin);
        _bridge.deposit(address(_token), 2 * DEPOSIT_AMOUNT, admin, "");

        (, bytes memory proof1, bytes memory auxTxSuffix1) =
            createTokenClaimProof(MIRROR_TOKEN, DEPOSIT_AMOUNT, user, 4, _bridge.domainSeparator());

        _bridge.claim(address(_token), DEPOSIT_AMOUNT, user, proof1, auxTxSuffix1);

        Bridge.ClaimParams[] memory claims = new Bridge.ClaimParams[](1);
        claims[0] = Bridge.ClaimParams({amount: DEPOSIT_AMOUNT, to: user, proof: proof1, auxTxSuffix: auxTxSuffix1});

        vm.expectRevert(abi.encodeWithSelector(Bridge.RequestAlreadyProcessed.selector));
        _bridge.batchClaim(address(_token), claims);
    }

    function test_BatchClaim_RevertIfPaused() public {
        vm.prank(admin);
        _bridge.setState(Bridge.ContractState.Paused);

        Bridge.ClaimParams[] memory claims = new Bridge.ClaimParams[](1);
        claims[0] = Bridge.ClaimParams({amount: DEPOSIT_AMOUNT, to: user, proof: "", auxTxSuffix: ""});

        vm.expectRevert(Bridge.ContractPaused.selector);
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
        vm.expectRevert(abi.encodeWithSelector(Bridge.InvalidTokenConfig.selector));
        _bridge.configureToken(address(0xCAFE), 1, 1, 1);
    }

    function test_ConfigureToken_ResetsDailyLimits() public {
        vm.prank(user);
        _bridge.deposit(address(_token), minAmount, user, "");
        (,,, Bridge.TokenUsage memory dep,,) = _bridge.tokenData(address(_token));
        assertEq(dep.consumed, minAmount);
        vm.prank(admin);
        _bridge.configureToken(address(_token), minAmount, depositLimit, claimLimit);
        (,,, Bridge.TokenUsage memory dep2,,) = _bridge.tokenData(address(_token));
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
        vm.expectRevert(abi.encodeWithSelector(Bridge.DailyLimitExhausted.selector));
        _bridge.deposit(address(_token), minAmount, user, "");
    }

    // ========== Whitelist Tests ==========

    function test_Whitelist_RevertIfSameTokenTwiceDifferentMirror() public {
        WrappedToken anotherMirror = new WrappedToken("Token", "TKN", 18);
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(Bridge.InvalidTokenConfig.selector));
        _bridge.whiteListToken(address(_token), address(anotherMirror), minAmount, depositLimit, claimLimit);
    }

    function test_WhiteListToken_RevertAfterMigrated() public {
        vm.startPrank(admin);
        _bridge.setState(Bridge.ContractState.Paused);
        _bridge.migrate(newBridge);
        vm.expectRevert(abi.encodeWithSelector(Bridge.ContractMigrated.selector));
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
        (,,, Bridge.TokenUsage memory dep1,,) = _bridge.tokenData(address(_token));
        assertEq(dep1.consumed, minAmount);

        (,,, Bridge.TokenUsage memory dep2,,) = _bridge.tokenData(t2);
        assertEq(dep2.consumed, 0);
    }

    // ========== Pause/State Tests ==========

    function test_Pause_Unpause() public {
        vm.prank(admin);
        _bridge.setState(Bridge.ContractState.Paused);
        assertEq(uint256(_bridge.contractState()), uint256(Bridge.ContractState.Paused));
        vm.prank(admin);
        _bridge.setState(Bridge.ContractState.Public);
        assertEq(uint256(_bridge.contractState()), uint256(Bridge.ContractState.Public));
    }

    function test_Pause_RevertIfNotPauseRole() public {
        vm.prank(user);
        vm.expectRevert();
        _bridge.setState(Bridge.ContractState.Paused);
    }

    function test_Pause_RoleRequired_Unpause_AdminRequired() public {
        vm.prank(user);
        vm.expectRevert();
        _bridge.setState(Bridge.ContractState.Paused);
        vm.prank(admin);
        _bridge.setState(Bridge.ContractState.Paused);
        vm.prank(user);
        vm.expectRevert();
        _bridge.setState(Bridge.ContractState.Public);
    }

    function test_RoleGrants_FromConstructor() public view {
        assertTrue(_bridge.hasRole(_bridge.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(_bridge.hasRole(_bridge.PAUSER_ROLE(), admin));
    }

    // ========== Migration Tests ==========

    function test_Migrate_SetsMigratedContract() public {
        vm.prank(admin);
        _bridge.setState(Bridge.ContractState.Paused);
        vm.prank(admin);
        _bridge.migrate(newBridge);
        assertEq(_bridge.migratedContract(), newBridge);
    }

    function test_Migrate_RevertIfAlreadyMigrated() public {
        vm.startPrank(admin);
        _bridge.setState(Bridge.ContractState.Paused);
        _bridge.migrate(newBridge);
        vm.expectRevert(abi.encodeWithSelector(Bridge.ContractMigrated.selector));
        _bridge.migrate(address(0x1234));
        vm.stopPrank();
    }

    function test_Migrate_TransfersAllTokenBalances() public {
        vm.prank(user);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, user, "");
        vm.startPrank(admin);
        _bridge.setState(Bridge.ContractState.Paused);
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
        address[] memory validators = new address[](NUMBER_OF_VALIDATORS);
        for (uint256 i = 0; i < NUMBER_OF_VALIDATORS; i++) {
            validators[i] = vm.addr(uint256(i + 1));
        }
        (Bridge fresh,) = BridgeDeployer.deploy(otherBridgeContract, SRC_CHAIN_ID, admin, validators, 1, 1, bytes32(0));
        vm.prank(admin);
        fresh.setState(Bridge.ContractState.Paused);
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
        _bridge.setState(Bridge.ContractState.Paused);
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
        _bridge.setState(Bridge.ContractState.Paused);
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
        vm.expectRevert(abi.encodeWithSelector(Bridge.ContractNotMigrated.selector));
        _bridge.transferTokensToMigrated(tokens);
    }

    function test_TransferTokensToMigrated_RevertIfNotAdmin() public {
        vm.startPrank(admin);
        _bridge.setState(Bridge.ContractState.Paused);
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
        vm.expectRevert(abi.encodeWithSelector(Bridge.InvalidPermitLength.selector));
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

        Bridge.DepositParams[] memory deposits = new Bridge.DepositParams[](2);
        deposits[0] = Bridge.DepositParams({from: user1, to: user1, amount: DEPOSIT_AMOUNT});
        deposits[1] = Bridge.DepositParams({from: user2, to: user2, amount: DEPOSIT_AMOUNT});

        Bridge.PermitParams[] memory permits = new Bridge.PermitParams[](2);
        permits[0] = Bridge.PermitParams({deadline: deadline, v: v1, r: r1, s: s1});
        permits[1] = Bridge.PermitParams({deadline: deadline, v: v2, r: r2, s: s2});

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

        Bridge.DepositParams[] memory deposits = new Bridge.DepositParams[](3);
        deposits[0] = Bridge.DepositParams({from: user1, to: user1, amount: DEPOSIT_AMOUNT});
        deposits[1] = Bridge.DepositParams({from: user2, to: user2, amount: DEPOSIT_AMOUNT});
        deposits[2] = Bridge.DepositParams({from: user3, to: user3, amount: DEPOSIT_AMOUNT});

        Bridge.PermitParams[] memory permits = new Bridge.PermitParams[](2);
        permits[0] = Bridge.PermitParams({deadline: deadline, v: v1, r: r1, s: s1});
        permits[1] = Bridge.PermitParams({deadline: deadline, v: v2, r: r2, s: s2});

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

        Bridge.DepositParams[] memory deposits = new Bridge.DepositParams[](1);
        deposits[0] = Bridge.DepositParams({from: user, to: user, amount: DEPOSIT_AMOUNT});

        Bridge.PermitParams[] memory permits = new Bridge.PermitParams[](0);

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

        Bridge.DepositParams[] memory deposits = new Bridge.DepositParams[](1);
        deposits[0] = Bridge.DepositParams({from: user, to: user, amount: DEPOSIT_AMOUNT});

        Bridge.PermitParams[] memory permits = new Bridge.PermitParams[](0);

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(Bridge.CallContractNotWhitelisted.selector));
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

        Bridge.DepositParams[] memory deposits = new Bridge.DepositParams[](1);
        deposits[0] = Bridge.DepositParams({from: user, to: user, amount: DEPOSIT_AMOUNT});

        Bridge.PermitParams[] memory permits = new Bridge.PermitParams[](0);

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(Bridge.AmountBelowReserve.selector));
        _bridge.batchDepositAndCall(address(permitToken), deposits, permits, callContract, DEPOSIT_AMOUNT + 1);
    }

    function test_DepositAndCall_RevertIfEmpty() public {
        address callContract = makeAddr("callContract");

        vm.startPrank(admin);
        _bridge.setCallContractWhitelist(callContract, true);
        _bridge.grantRole(_bridge.RELAYER_ROLE(), admin);
        vm.stopPrank();

        Bridge.DepositParams[] memory deposits = new Bridge.DepositParams[](0);
        Bridge.PermitParams[] memory permits = new Bridge.PermitParams[](0);

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(Bridge.InvalidTokenAmount.selector));
        _bridge.batchDepositAndCall(address(_token), deposits, permits, callContract, minAmount);
    }

    // ========== Validator Management Tests ==========

    function test_ValidatorInitialization() public view {
        for (uint256 i = 0; i < NUMBER_OF_VALIDATORS; i++) {
            assertTrue(_bridge.activeValidators(vm.addr(validatorPrivateKeys[i])));
        }
        assertEq(_bridge.validatorCount(), NUMBER_OF_VALIDATORS);
        assertEq(_bridge.adversarialResilience(), (NUMBER_OF_VALIDATORS - 1) / 3);
        assertTrue(_bridge.domainSeparator() != bytes32(0));
    }

    function test_UpdateValidatorConfig_AddValidator() public {
        address newValidator = makeAddr("newValidator");
        address[] memory addValidators = new address[](1);
        addValidators[0] = newValidator;
        address[] memory removeValidators = new address[](0);

        vm.prank(admin);
        vm.expectEmit(true, false, false, true);
        emit Bridge.ValidatorAdded(newValidator);
        _bridge.updateValidatorConfig(1, 1, bytes32(0), addValidators, removeValidators);

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
        emit Bridge.ValidatorRemoved(validatorToRemove);
        _bridge.updateValidatorConfig(1, 1, bytes32(0), addValidators, removeValidators);

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
        _bridge.updateValidatorConfig(1, 1, bytes32(0), addValidators, removeValidators);

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
        _bridge.updateValidatorConfig(1, 1, bytes32(0), addValidators, removeValidators);
    }

    function test_UpdateValidatorConfig_RevertIfZeroAddress() public {
        address[] memory addValidators = new address[](1);
        addValidators[0] = address(0);
        address[] memory removeValidators = new address[](0);

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(Bridge.ValidatorIsZeroAddress.selector));
        _bridge.updateValidatorConfig(1, 1, bytes32(0), addValidators, removeValidators);
    }

    function test_UpdateValidatorConfig_RevertIfDuplicate() public {
        address existingValidator = vm.addr(validatorPrivateKeys[0]);
        address[] memory addValidators = new address[](1);
        addValidators[0] = existingValidator;
        address[] memory removeValidators = new address[](0);

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(Bridge.DuplicateValidator.selector));
        _bridge.updateValidatorConfig(1, 1, bytes32(0), addValidators, removeValidators);
    }

    function test_UpdateValidatorConfig_RevertIfValidatorDoesNotExist() public {
        address nonExistentValidator = makeAddr("nonExistent");
        address[] memory addValidators = new address[](0);
        address[] memory removeValidators = new address[](1);
        removeValidators[0] = nonExistentValidator;

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(Bridge.ValidatorDoesNotExist.selector));
        _bridge.updateValidatorConfig(1, 1, bytes32(0), addValidators, removeValidators);
    }

    function test_UpdateValidatorConfig_RevertIfInvalidResilience() public {
        address[] memory addValidators = new address[](0);
        address[] memory removeValidators = new address[](0);

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(Bridge.InvalidAdverserialResilience.selector));
        _bridge.updateValidatorConfig(0, 1, bytes32(0), addValidators, removeValidators);

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(Bridge.InvalidAdverserialResilience.selector));
        // forge-lint: disable-next-line(unsafe-typecast)
        _bridge.updateValidatorConfig(uint64(NUMBER_OF_VALIDATORS + 1), 1, bytes32(0), addValidators, removeValidators);
    }

    function test_ComputeTxWeight_RevertIfSignatureOrderInvalid() public {
        vm.prank(admin);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, admin, "");

        // Get the correct txHash that will be computed during claim
        bytes32 domainSep = _bridge.domainSeparator();
        bytes4 selector = bytes4(keccak256("deposit(address,uint256,address)"));
        bytes32 dataHash = keccak256(
            abi.encodePacked(selector, uint256(uint160(MIRROR_TOKEN)), DEPOSIT_AMOUNT, uint256(uint160(user)))
        );
        bytes32 txHash =
            keccak256(abi.encodePacked(domainSep, bytes32(uint256(uint160(otherBridgeContract))), dataHash));

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

        // Prepend proof type byte (0 = Certificate)
        bytes memory proof = abi.encodePacked(uint8(ProofLib.ProofType.Certificate), aggregatedSignatures);

        vm.expectRevert(abi.encodeWithSelector(ProofLib.InvalidSignatureOrder.selector));
        _bridge.claim(address(_token), DEPOSIT_AMOUNT, user, proof, "");
    }

    function test_ComputeTxWeight_RevertIfSignerNotActive() public {
        vm.prank(admin);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, admin, "");

        // Use a non-validator private key
        uint256 nonValidatorKey = 0xDEAD;

        // Get the correct txHash that will be computed during claim
        bytes32 domainSep = _bridge.domainSeparator();
        bytes4 selector = bytes4(keccak256("deposit(address,uint256,address)"));
        bytes32 dataHash = keccak256(
            abi.encodePacked(selector, uint256(uint160(MIRROR_TOKEN)), DEPOSIT_AMOUNT, uint256(uint160(user)))
        );
        bytes32 txHash =
            keccak256(abi.encodePacked(domainSep, bytes32(uint256(uint160(otherBridgeContract))), dataHash));

        // Create claim proof with signatures from non-validators
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(nonValidatorKey, txHash);
        bytes memory aggregatedSignatures = abi.encodePacked(r, s, v);

        // Prepend proof type byte (0 = Certificate)
        bytes memory proof = abi.encodePacked(uint8(ProofLib.ProofType.Certificate), aggregatedSignatures);

        vm.expectRevert(abi.encodeWithSelector(ProofLib.SignerNotActiveValidator.selector));
        _bridge.claim(address(_token), DEPOSIT_AMOUNT, user, proof, "");
    }

    // ========== Merkle Proof Tests ==========

    function _computeTxHash(address mirrorToken, uint256 amount, address to, bytes32 domainSep)
        internal
        view
        returns (bytes32)
    {
        bytes4 selector = bytes4(keccak256("deposit(address,uint256,address)"));
        bytes32 dataHash =
            keccak256(abi.encodePacked(selector, uint256(uint160(mirrorToken)), amount, uint256(uint160(to))));
        return keccak256(abi.encodePacked(domainSep, bytes32(uint256(uint160(otherBridgeContract))), dataHash));
    }

    function _buildMerkleTree(bytes32[] memory leaves) internal pure returns (bytes32 root) {
        require(leaves.length > 0, "empty leaves");

        // Make a copy to avoid modifying original
        bytes32[] memory layer = new bytes32[](leaves.length);
        for (uint256 i = 0; i < leaves.length; i++) {
            layer[i] = leaves[i];
        }

        uint256 n = layer.length;

        // Build tree bottom-up
        while (n > 1) {
            uint256 j = 0;
            for (uint256 i = 0; i < n; i += 2) {
                if (i + 1 < n) {
                    // Hash pair in sorted order (OpenZeppelin convention)
                    layer[j] = _hashPair(layer[i], layer[i + 1]);
                } else {
                    // Odd node, promote to next level
                    layer[j] = layer[i];
                }
                j++;
            }
            n = j;
        }
        return layer[0];
    }

    function _hashPair(bytes32 a, bytes32 b) internal pure returns (bytes32) {
        return a < b ? keccak256(abi.encodePacked(a, b)) : keccak256(abi.encodePacked(b, a));
    }

    function _getMerkleProof(bytes32[] memory leaves, uint256 index) internal pure returns (bytes32[] memory proof) {
        require(leaves.length > 0, "empty leaves");
        require(index < leaves.length, "index out of bounds");

        // Calculate proof length
        uint256 proofLen = 0;
        uint256 n = leaves.length;
        while (n > 1) {
            proofLen++;
            n = (n + 1) / 2;
        }

        proof = new bytes32[](proofLen);
        uint256 proofIndex = 0;

        // Make a copy to avoid modifying original
        bytes32[] memory layer = new bytes32[](leaves.length);
        for (uint256 i = 0; i < leaves.length; i++) {
            layer[i] = leaves[i];
        }

        n = leaves.length;
        uint256 idx = index;

        while (n > 1) {
            uint256 siblingIdx = (idx % 2 == 0) ? idx + 1 : idx - 1;
            if (siblingIdx < n) {
                proof[proofIndex] = layer[siblingIdx];
            } else {
                // No sibling, proof element is same as current (won't be used)
                proof[proofIndex] = layer[idx];
            }
            proofIndex++;

            // Build next layer
            uint256 j = 0;
            for (uint256 i = 0; i < n; i += 2) {
                if (i + 1 < n) {
                    layer[j] = _hashPair(layer[i], layer[i + 1]);
                } else {
                    layer[j] = layer[i];
                }
                j++;
            }
            n = j;
            idx = idx / 2;
        }

        // Trim proof to actual length used
        assembly {
            mstore(proof, proofIndex)
        }
    }

    function test_Claim_WithMerkleProof() public {
        vm.prank(admin);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, admin, "");

        // Compute the txHash for the claim
        bytes32 txHash = _computeTxHash(MIRROR_TOKEN, DEPOSIT_AMOUNT, user, _bridge.domainSeparator());

        // Create a merkle tree with the txHash as a leaf
        bytes32[] memory leaves = new bytes32[](4);
        leaves[0] = txHash;
        leaves[1] = keccak256("other tx 1");
        leaves[2] = keccak256("other tx 2");
        leaves[3] = keccak256("other tx 3");

        bytes32 merkleRoot = _buildMerkleTree(leaves);
        bytes32[] memory merkleProofArray = _getMerkleProof(leaves, 0);

        // Update bridge with merkle root
        address[] memory empty = new address[](0);
        vm.prank(admin);
        _bridge.updateValidatorConfig(1, 1, merkleRoot, empty, empty);

        assertEq(_bridge.merkleRoot(), merkleRoot);

        // Build proof bytes: type (1 byte) + abi.encoded proof array
        bytes memory proof = abi.encodePacked(uint8(ProofLib.ProofType.Merkle), abi.encode(merkleProofArray));

        uint256 initialBalance = _token.balanceOf(user);

        vm.expectEmit(true, true, true, true);
        emit Bridge.Claim(txHash, address(_token), MIRROR_TOKEN, DEPOSIT_AMOUNT, user);
        _bridge.claim(address(_token), DEPOSIT_AMOUNT, user, proof, "");

        assertEq(_token.balanceOf(user), initialBalance + DEPOSIT_AMOUNT);
    }

    function test_Claim_RevertIfInvalidMerkleProof() public {
        vm.prank(admin);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, admin, "");

        // Create a merkle tree WITHOUT the actual txHash
        bytes32[] memory leaves = new bytes32[](4);
        leaves[0] = keccak256("wrong tx");
        leaves[1] = keccak256("other tx 1");
        leaves[2] = keccak256("other tx 2");
        leaves[3] = keccak256("other tx 3");

        bytes32 merkleRoot = _buildMerkleTree(leaves);
        bytes32[] memory merkleProofArray = _getMerkleProof(leaves, 0);

        // Update bridge with merkle root
        address[] memory empty = new address[](0);
        vm.prank(admin);
        _bridge.updateValidatorConfig(1, 1, merkleRoot, empty, empty);

        // Build proof bytes with wrong proof
        bytes memory proof = abi.encodePacked(uint8(ProofLib.ProofType.Merkle), abi.encode(merkleProofArray));

        vm.expectRevert(abi.encodeWithSelector(Bridge.InvalidMerkleProof.selector));
        _bridge.claim(address(_token), DEPOSIT_AMOUNT, user, proof, "");
    }

    function test_Claim_MerkleProofWorksAfterVersionUpdate() public {
        vm.prank(admin);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, admin, "");

        // Get certificate proof with current version
        (, bytes memory certProof, bytes memory auxTxSuffix) =
            createTokenClaimProof(MIRROR_TOKEN, DEPOSIT_AMOUNT, user, 4, _bridge.domainSeparator());

        // Compute txHash with current domain separator (before version update)
        bytes32 txHashOldVersion = _computeTxHash(MIRROR_TOKEN, DEPOSIT_AMOUNT, user, _bridge.domainSeparator());

        // Create merkle tree with the old version txHash
        bytes32[] memory leaves = new bytes32[](2);
        leaves[0] = txHashOldVersion;
        leaves[1] = keccak256("other tx");

        bytes32 newMerkleRoot = _buildMerkleTree(leaves);
        bytes32[] memory merkleProofArray = _getMerkleProof(leaves, 0);

        // Update version (invalidates old certificates) and set merkle root
        address[] memory empty = new address[](0);
        vm.prank(admin);
        _bridge.updateValidatorConfig(1, 2, newMerkleRoot, empty, empty);

        // Certificate proof should now fail (version changed, domain separator changed)
        vm.expectRevert();
        _bridge.claim(address(_token), DEPOSIT_AMOUNT, user, certProof, auxTxSuffix);

        // But merkle proof should work (uses the old txHash stored in tree)
        // Note: We need to compute txHash with OLD domain separator, but the claim function
        // uses the current domain separator. So this test actually shows that after version
        // update, you need a merkle proof for txHash computed with the NEW domain separator.

        // Let's compute with new domain separator
        bytes32 txHashNewVersion = _computeTxHash(MIRROR_TOKEN, DEPOSIT_AMOUNT, user, _bridge.domainSeparator());

        // Create merkle tree with new version txHash
        leaves[0] = txHashNewVersion;
        newMerkleRoot = _buildMerkleTree(leaves);
        merkleProofArray = _getMerkleProof(leaves, 0);

        // Update merkle root again
        vm.prank(admin);
        _bridge.updateValidatorConfig(1, 2, newMerkleRoot, empty, empty);

        bytes memory merkleProof = abi.encodePacked(uint8(ProofLib.ProofType.Merkle), abi.encode(merkleProofArray));

        uint256 initialBalance = _token.balanceOf(user);
        _bridge.claim(address(_token), DEPOSIT_AMOUNT, user, merkleProof, "");
        assertEq(_token.balanceOf(user), initialBalance + DEPOSIT_AMOUNT);
    }

    function test_Claim_RevertIfInvalidProofType() public {
        vm.prank(admin);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, admin, "");

        // Create proof with invalid type (2)
        bytes memory invalidProof = abi.encodePacked(uint8(2), bytes("some data"));

        vm.expectRevert();
        _bridge.claim(address(_token), DEPOSIT_AMOUNT, user, invalidProof, "");
    }

    function test_BatchClaim_WithMerkleProof() public {
        vm.prank(admin);
        _bridge.deposit(address(_token), 2 * DEPOSIT_AMOUNT, admin, "");

        address user1 = makeAddr("user1");

        // Compute txHash for the claim
        bytes32 txHash = _computeTxHash(MIRROR_TOKEN, DEPOSIT_AMOUNT, user1, _bridge.domainSeparator());

        // Create merkle tree
        bytes32[] memory leaves = new bytes32[](2);
        leaves[0] = txHash;
        leaves[1] = keccak256("other tx");

        bytes32 merkleRoot = _buildMerkleTree(leaves);
        bytes32[] memory merkleProofArray = _getMerkleProof(leaves, 0);

        // Update bridge with merkle root
        address[] memory empty = new address[](0);
        vm.prank(admin);
        _bridge.updateValidatorConfig(1, 1, merkleRoot, empty, empty);

        bytes memory proof = abi.encodePacked(uint8(ProofLib.ProofType.Merkle), abi.encode(merkleProofArray));

        Bridge.ClaimParams[] memory claims = new Bridge.ClaimParams[](1);
        claims[0] = Bridge.ClaimParams({amount: DEPOSIT_AMOUNT, to: user1, proof: proof, auxTxSuffix: ""});

        vm.expectEmit(true, true, true, true);
        emit Bridge.Claim(txHash, address(_token), MIRROR_TOKEN, DEPOSIT_AMOUNT, user1);

        _bridge.batchClaim(address(_token), claims);

        assertEq(_token.balanceOf(user1), DEPOSIT_AMOUNT);
    }

    function test_UpdateValidatorConfig_UpdatesMerkleRoot() public {
        bytes32 newRoot = keccak256("new merkle root");
        address[] memory empty = new address[](0);

        assertEq(_bridge.merkleRoot(), bytes32(0));

        vm.prank(admin);
        _bridge.updateValidatorConfig(1, 1, newRoot, empty, empty);

        assertEq(_bridge.merkleRoot(), newRoot);
    }
}

/// @dev Test harness that exposes internal functions for testing
contract BridgeHarness is Bridge {
    // Storage for testing _checkInLimits
    TokenUsage public testUsage;

    constructor(address _bridgeContract, uint256 _chainId) Bridge(_bridgeContract, _chainId) {}

    function exposed_updateValidatorSet(
        address[] memory addValidators,
        address[] memory removeValidators,
        uint64 _adversarialResilience
    ) external {
        _updateValidatorSet(addValidators, removeValidators, _adversarialResilience);
    }

    function exposed_checkInLimits(uint256 minAmount, uint256 maxTotalAmount, uint256 amount) external {
        _checkInLimits(testUsage, minAmount, maxTotalAmount, amount);
    }

    function setTestUsage(uint256 consumed, uint256 lastUpdated) external {
        testUsage.consumed = consumed;
        testUsage.lastUpdated = lastUpdated;
    }

    function getTestUsage() external view returns (uint256 consumed, uint256 lastUpdated) {
        return (testUsage.consumed, testUsage.lastUpdated);
    }
}

contract BridgeUpdateValidatorSetTest is Test {
    BridgeHarness internal harness;

    address public admin = makeAddr("admin");
    address public validator1 = makeAddr("validator1");
    address public validator2 = makeAddr("validator2");
    address public validator3 = makeAddr("validator3");

    function setUp() public {
        address otherBridge = makeAddr("otherBridge");
        harness = new BridgeHarness(otherBridge, 1);
    }

    function test_UpdateValidatorSet_AddsValidators() public {
        address[] memory add = new address[](2);
        add[0] = validator1;
        add[1] = validator2;
        address[] memory remove = new address[](0);

        harness.exposed_updateValidatorSet(add, remove, 1);

        assertTrue(harness.activeValidators(validator1));
        assertTrue(harness.activeValidators(validator2));
        assertEq(harness.validatorCount(), 2);
        assertEq(harness.adversarialResilience(), 1);
    }

    function test_UpdateValidatorSet_RemovesValidators() public {
        // First add validators
        address[] memory add = new address[](2);
        add[0] = validator1;
        add[1] = validator2;
        harness.exposed_updateValidatorSet(add, new address[](0), 1);

        // Then remove one
        address[] memory remove = new address[](1);
        remove[0] = validator1;
        harness.exposed_updateValidatorSet(new address[](0), remove, 1);

        assertFalse(harness.activeValidators(validator1));
        assertTrue(harness.activeValidators(validator2));
        assertEq(harness.validatorCount(), 1);
    }

    function test_UpdateValidatorSet_AddsAndRemovesAtomically() public {
        // First add validators
        address[] memory add = new address[](2);
        add[0] = validator1;
        add[1] = validator2;
        harness.exposed_updateValidatorSet(add, new address[](0), 1);

        // Add validator3 and remove validator1 in one call
        address[] memory addNew = new address[](1);
        addNew[0] = validator3;
        address[] memory remove = new address[](1);
        remove[0] = validator1;
        harness.exposed_updateValidatorSet(addNew, remove, 1);

        assertFalse(harness.activeValidators(validator1));
        assertTrue(harness.activeValidators(validator2));
        assertTrue(harness.activeValidators(validator3));
        assertEq(harness.validatorCount(), 2);
    }

    function test_UpdateValidatorSet_RevertIfZeroAddress() public {
        address[] memory add = new address[](1);
        add[0] = address(0);

        vm.expectRevert(Bridge.ValidatorIsZeroAddress.selector);
        harness.exposed_updateValidatorSet(add, new address[](0), 1);
    }

    function test_UpdateValidatorSet_RevertIfDuplicateValidator() public {
        // First add a validator
        address[] memory add = new address[](1);
        add[0] = validator1;
        harness.exposed_updateValidatorSet(add, new address[](0), 1);

        // Try to add the same validator again
        vm.expectRevert(Bridge.DuplicateValidator.selector);
        harness.exposed_updateValidatorSet(add, new address[](0), 1);
    }

    function test_UpdateValidatorSet_RevertIfValidatorDoesNotExist() public {
        address[] memory remove = new address[](1);
        remove[0] = validator1;

        vm.expectRevert(Bridge.ValidatorDoesNotExist.selector);
        harness.exposed_updateValidatorSet(new address[](0), remove, 1);
    }

    function test_UpdateValidatorSet_RevertIfResilienceZero() public {
        address[] memory add = new address[](1);
        add[0] = validator1;

        vm.expectRevert(Bridge.InvalidAdverserialResilience.selector);
        harness.exposed_updateValidatorSet(add, new address[](0), 0);
    }

    function test_UpdateValidatorSet_RevertIfResilienceExceedsValidatorCount() public {
        address[] memory add = new address[](1);
        add[0] = validator1;

        vm.expectRevert(Bridge.InvalidAdverserialResilience.selector);
        harness.exposed_updateValidatorSet(add, new address[](0), 2);
    }

    function test_UpdateValidatorSet_ResilienceCheckedAfterCountUpdate() public {
        // Add 3 validators with resilience 3
        address[] memory add = new address[](3);
        add[0] = validator1;
        add[1] = validator2;
        add[2] = validator3;
        harness.exposed_updateValidatorSet(add, new address[](0), 3);

        assertEq(harness.validatorCount(), 3);
        assertEq(harness.adversarialResilience(), 3);

        // Remove one validator - resilience must be reduced too
        address[] memory remove = new address[](1);
        remove[0] = validator1;

        // This should fail because new count would be 2 but resilience 3
        vm.expectRevert(Bridge.InvalidAdverserialResilience.selector);
        harness.exposed_updateValidatorSet(new address[](0), remove, 3);

        // This should succeed with reduced resilience
        harness.exposed_updateValidatorSet(new address[](0), remove, 2);
        assertEq(harness.validatorCount(), 2);
        assertEq(harness.adversarialResilience(), 2);
    }

    function test_UpdateValidatorSet_EmitsEvents() public {
        address[] memory add = new address[](1);
        add[0] = validator1;

        vm.expectEmit(true, false, false, false);
        emit Bridge.ValidatorAdded(validator1);
        harness.exposed_updateValidatorSet(add, new address[](0), 1);

        address[] memory remove = new address[](1);
        remove[0] = validator1;
        address[] memory addNew = new address[](1);
        addNew[0] = validator2;

        vm.expectEmit(true, false, false, false);
        emit Bridge.ValidatorRemoved(validator1);
        vm.expectEmit(true, false, false, false);
        emit Bridge.ValidatorAdded(validator2);
        harness.exposed_updateValidatorSet(addNew, remove, 1);
    }

    // ========== Property Tests (Fuzz) ==========

    function testFuzz_UpdateValidatorSet_ValidatorCountMatchesAddsMinusRemoves(uint8 numAdd, uint8 numRemove) public {
        // Bound inputs to reasonable sizes
        numAdd = uint8(bound(numAdd, 1, 20));
        numRemove = uint8(bound(numRemove, 0, numAdd));

        // Create unique validators to add
        address[] memory add = new address[](numAdd);
        for (uint256 i = 0; i < numAdd; i++) {
            add[i] = address(uint160(i + 1));
        }

        // Add validators
        harness.exposed_updateValidatorSet(add, new address[](0), 1);
        assertEq(harness.validatorCount(), numAdd);

        // Remove some validators
        address[] memory remove = new address[](numRemove);
        for (uint256 i = 0; i < numRemove; i++) {
            remove[i] = add[i];
        }

        uint64 expectedCount = uint64(numAdd - numRemove);
        uint64 newResilience = expectedCount > 0 ? 1 : 0;

        if (expectedCount == 0) {
            vm.expectRevert(Bridge.InvalidAdverserialResilience.selector);
            harness.exposed_updateValidatorSet(new address[](0), remove, 1);
        } else {
            harness.exposed_updateValidatorSet(new address[](0), remove, newResilience);
            assertEq(harness.validatorCount(), expectedCount);
        }
    }

    function testFuzz_UpdateValidatorSet_ResilienceInvariant(uint8 numValidators, uint64 resilience) public {
        numValidators = uint8(bound(numValidators, 1, 50));

        address[] memory add = new address[](numValidators);
        for (uint256 i = 0; i < numValidators; i++) {
            add[i] = address(uint160(i + 1));
        }

        // Test invalid resilience values
        if (resilience == 0 || resilience > numValidators) {
            vm.expectRevert(Bridge.InvalidAdverserialResilience.selector);
            harness.exposed_updateValidatorSet(add, new address[](0), resilience);
        } else {
            harness.exposed_updateValidatorSet(add, new address[](0), resilience);
            // Invariant: resilience > 0 && resilience <= validatorCount
            assertGt(harness.adversarialResilience(), 0);
            assertLe(harness.adversarialResilience(), harness.validatorCount());
        }
    }

    function testFuzz_UpdateValidatorSet_AllAddedValidatorsAreActive(uint8 numValidators) public {
        numValidators = uint8(bound(numValidators, 1, 50));

        address[] memory add = new address[](numValidators);
        for (uint256 i = 0; i < numValidators; i++) {
            add[i] = address(uint160(i + 1));
        }

        harness.exposed_updateValidatorSet(add, new address[](0), 1);

        // All added validators should be active
        for (uint256 i = 0; i < numValidators; i++) {
            assertTrue(harness.activeValidators(add[i]));
        }
    }

    function testFuzz_UpdateValidatorSet_AllRemovedValidatorsAreInactive(uint8 numAdd, uint8 numRemove) public {
        numAdd = uint8(bound(numAdd, 2, 20));
        numRemove = uint8(bound(numRemove, 1, numAdd - 1)); // Keep at least 1

        address[] memory add = new address[](numAdd);
        for (uint256 i = 0; i < numAdd; i++) {
            add[i] = address(uint160(i + 1));
        }

        harness.exposed_updateValidatorSet(add, new address[](0), 1);

        address[] memory remove = new address[](numRemove);
        for (uint256 i = 0; i < numRemove; i++) {
            remove[i] = add[i];
        }

        harness.exposed_updateValidatorSet(new address[](0), remove, 1);

        // All removed validators should be inactive
        for (uint256 i = 0; i < numRemove; i++) {
            assertFalse(harness.activeValidators(remove[i]));
        }
        // Remaining validators should still be active
        for (uint256 i = numRemove; i < numAdd; i++) {
            assertTrue(harness.activeValidators(add[i]));
        }
    }

    function testFuzz_UpdateValidatorSet_AddThenRemoveSameValidator(address validator) public {
        vm.assume(validator != address(0));

        // Add validator
        address[] memory add = new address[](1);
        add[0] = validator;
        harness.exposed_updateValidatorSet(add, new address[](0), 1);

        assertTrue(harness.activeValidators(validator));
        assertEq(harness.validatorCount(), 1);

        // Add another so we can remove the first
        address other = address(uint160(uint256(keccak256(abi.encode(validator)))));
        vm.assume(other != address(0) && other != validator);
        add[0] = other;
        harness.exposed_updateValidatorSet(add, new address[](0), 1);

        // Remove original validator
        address[] memory remove = new address[](1);
        remove[0] = validator;
        harness.exposed_updateValidatorSet(new address[](0), remove, 1);

        assertFalse(harness.activeValidators(validator));
        assertTrue(harness.activeValidators(other));
        assertEq(harness.validatorCount(), 1);
    }

    function testFuzz_UpdateValidatorSet_SimultaneousAddAndRemove(uint8 numInitial, uint8 numRemove, uint8 numAdd)
        public
    {
        numInitial = uint8(bound(numInitial, 1, 10));
        numRemove = uint8(bound(numRemove, 0, numInitial));
        numAdd = uint8(bound(numAdd, 0, 10));

        // Need at least one validator remaining or being added
        vm.assume(numInitial - numRemove + numAdd > 0);

        // Setup initial validators
        address[] memory initial = new address[](numInitial);
        for (uint256 i = 0; i < numInitial; i++) {
            initial[i] = address(uint160(i + 1));
        }
        harness.exposed_updateValidatorSet(initial, new address[](0), 1);

        // Prepare adds and removes
        address[] memory toRemove = new address[](numRemove);
        for (uint256 i = 0; i < numRemove; i++) {
            toRemove[i] = initial[i];
        }

        address[] memory toAdd = new address[](numAdd);
        for (uint256 i = 0; i < numAdd; i++) {
            toAdd[i] = address(uint160(1000 + i)); // Different range to avoid duplicates
        }

        uint64 expectedCount = uint64(numInitial - numRemove + numAdd);
        harness.exposed_updateValidatorSet(toAdd, toRemove, 1);

        assertEq(harness.validatorCount(), expectedCount);

        // Verify removed are inactive
        for (uint256 i = 0; i < numRemove; i++) {
            assertFalse(harness.activeValidators(toRemove[i]));
        }
        // Verify added are active
        for (uint256 i = 0; i < numAdd; i++) {
            assertTrue(harness.activeValidators(toAdd[i]));
        }
        // Verify remaining initial are still active
        for (uint256 i = numRemove; i < numInitial; i++) {
            assertTrue(harness.activeValidators(initial[i]));
        }
    }

    function testFuzz_UpdateValidatorSet_CannotAddZeroAddress(uint8 position, uint8 numValidators) public {
        numValidators = uint8(bound(numValidators, 1, 10));
        position = uint8(bound(position, 0, numValidators - 1));

        address[] memory add = new address[](numValidators);
        for (uint256 i = 0; i < numValidators; i++) {
            add[i] = address(uint160(i + 1));
        }
        // Insert zero address at random position
        add[position] = address(0);

        vm.expectRevert(Bridge.ValidatorIsZeroAddress.selector);
        harness.exposed_updateValidatorSet(add, new address[](0), 1);
    }

    function testFuzz_UpdateValidatorSet_CannotAddDuplicate(address validator) public {
        vm.assume(validator != address(0));

        address[] memory add = new address[](1);
        add[0] = validator;
        harness.exposed_updateValidatorSet(add, new address[](0), 1);

        // Try to add same validator in same array
        address[] memory addDuplicate = new address[](2);
        addDuplicate[0] = address(uint160(uint256(keccak256(abi.encode(validator)))));
        vm.assume(addDuplicate[0] != address(0) && addDuplicate[0] != validator);
        addDuplicate[1] = validator; // Already exists

        vm.expectRevert(Bridge.DuplicateValidator.selector);
        harness.exposed_updateValidatorSet(addDuplicate, new address[](0), 1);
    }
}

contract BridgeCheckInLimitsTest is Test {
    BridgeHarness internal harness;

    uint256 constant MIN_AMOUNT = 1e18;
    uint256 constant MAX_TOTAL = 100e18;

    function setUp() public {
        address otherBridge = makeAddr("otherBridge");
        harness = new BridgeHarness(otherBridge, 1);
    }

    // ========== Unit Tests ==========

    function test_CheckInLimits_BasicDeposit() public {
        harness.setTestUsage(0, block.timestamp);

        harness.exposed_checkInLimits(MIN_AMOUNT, MAX_TOTAL, 50e18);

        (uint256 consumed,) = harness.getTestUsage();
        assertEq(consumed, 50e18);
    }

    function test_CheckInLimits_RevertIfBelowMin() public {
        harness.setTestUsage(0, block.timestamp);

        vm.expectRevert(Bridge.InvalidTokenAmount.selector);
        harness.exposed_checkInLimits(MIN_AMOUNT, MAX_TOTAL, MIN_AMOUNT - 1);
    }

    function test_CheckInLimits_RevertIfExceedsLimitSameDay() public {
        harness.setTestUsage(80e18, block.timestamp);

        vm.expectRevert(Bridge.DailyLimitExhausted.selector);
        harness.exposed_checkInLimits(MIN_AMOUNT, MAX_TOTAL, 30e18);
    }

    function test_CheckInLimits_FillsRemainingThenAppliesExcess() public {
        // Setup: consumed=80, limit=100, remaining=20
        harness.setTestUsage(80e18, block.timestamp);

        // Warp past reset period
        vm.warp(block.timestamp + 1 days + 1);

        // Deposit 50: fills 20 remaining, excess=30 goes to new period
        harness.exposed_checkInLimits(MIN_AMOUNT, MAX_TOTAL, 50e18);

        (uint256 consumed,) = harness.getTestUsage();
        assertEq(consumed, 30e18); // excess = 50 - 20 = 30
    }

    function test_CheckInLimits_ExcessEqualsLimit() public {
        // Setup: consumed=80, limit=100, remaining=20
        harness.setTestUsage(80e18, block.timestamp);

        vm.warp(block.timestamp + 1 days + 1);

        // Deposit 120: fills 20 remaining, excess=100 (exactly at limit)
        harness.exposed_checkInLimits(MIN_AMOUNT, MAX_TOTAL, 120e18);

        (uint256 consumed,) = harness.getTestUsage();
        assertEq(consumed, 100e18);
    }

    function test_CheckInLimits_RevertIfExcessExceedsLimit() public {
        harness.setTestUsage(80e18, block.timestamp);

        vm.warp(block.timestamp + 1 days + 1);

        // Deposit 121: excess=101 > 100
        vm.expectRevert(Bridge.DailyLimitExhausted.selector);
        harness.exposed_checkInLimits(MIN_AMOUNT, MAX_TOTAL, 121e18);
    }

    // ========== Property Tests (Fuzz) ==========
    //
    // Property 1: Multiple deposits totaling <= limit within 1 day always succeed
    // Property 2: Cannot spend > 2x limit over 2 days
    // Property 3: Splitting deposits doesn't change the outcome
    // Property 4: Reverts if amount < minAmount

    /// @notice Property 1: Multiple deposits within limit always succeed
    /// Split a total amount into 3 deposits, all within same day, total <= limit
    function testFuzz_Property1_MultipleDepositsWithinLimitSucceed(uint256 amount1, uint256 amount2, uint256 amount3)
        public
    {
        uint256 limit = MAX_TOTAL;

        // Bound each amount to be valid and total <= limit
        amount1 = bound(amount1, MIN_AMOUNT, limit / 3);
        amount2 = bound(amount2, MIN_AMOUNT, limit / 3);
        amount3 = bound(amount3, MIN_AMOUNT, limit / 3);

        uint256 total = amount1 + amount2 + amount3;

        uint256 startTime = 1000;
        vm.warp(startTime);
        harness.setTestUsage(0, startTime);

        // All three deposits should succeed
        harness.exposed_checkInLimits(MIN_AMOUNT, limit, amount1);
        harness.exposed_checkInLimits(MIN_AMOUNT, limit, amount2);
        harness.exposed_checkInLimits(MIN_AMOUNT, limit, amount3);

        (uint256 consumed,) = harness.getTestUsage();
        assertEq(consumed, total);
        assertLe(consumed, limit);
    }

    /// @notice Property 2: Cannot spend > 2x limit over 2 days
    /// Total of day1 + day2 > 2*limit must fail
    function testFuzz_Property2_CannotExceed2xLimitOver2Days(uint256 day1Amount, uint256 excessOverLimit) public {
        uint256 limit = MAX_TOTAL;

        // Day 1: spend some amount
        day1Amount = bound(day1Amount, MIN_AMOUNT, limit);

        // Day 2: we want total > 2*limit, so day2 > 2*limit - day1
        // excess = day1 + day2 - limit, and we need excess > limit
        // So: day2 > 2*limit - day1
        // Let excessOverLimit be how much over limit the excess is (must be > 0)
        excessOverLimit = bound(excessOverLimit, 1, limit);

        // day2 = (2*limit - day1) + excessOverLimit + 1
        // This ensures: day1 + day2 = 2*limit + excessOverLimit + 1 > 2*limit
        uint256 day2Amount = 2 * limit - day1Amount + excessOverLimit;
        vm.assume(day2Amount >= MIN_AMOUNT);

        uint256 startTime = 1000;
        vm.warp(startTime);
        harness.setTestUsage(0, startTime);

        // Day 1 deposit succeeds
        harness.exposed_checkInLimits(MIN_AMOUNT, limit, day1Amount);

        // Move to day 2
        vm.warp(startTime + 1 days + 1);

        // Day 2 deposit should fail because excess > limit
        vm.expectRevert(Bridge.DailyLimitExhausted.selector);
        harness.exposed_checkInLimits(MIN_AMOUNT, limit, day2Amount);
    }

    /// @notice Property 3a: Single deposit crossing boundary has correct excess
    /// Compute expected excess and verify single deposit matches
    function testFuzz_Property3a_SingleDepositExcess(uint256 initialConsumed, uint256 excessAmount) public {
        uint256 limit = MAX_TOTAL;

        // Start with some consumed amount
        initialConsumed = bound(initialConsumed, limit / 4, limit * 3 / 4);
        uint256 remaining = limit - initialConsumed;

        // Excess is how much goes into the new period (must be <= limit)
        excessAmount = bound(excessAmount, 1, limit);

        // Total deposit = remaining + excess (crosses boundary)
        uint256 depositAmount = remaining + excessAmount;
        vm.assume(depositAmount >= MIN_AMOUNT);

        uint256 startTime = 1000;
        vm.warp(startTime);
        harness.setTestUsage(initialConsumed, startTime);

        // Move past reset window
        vm.warp(startTime + 1 days + 1);

        harness.exposed_checkInLimits(MIN_AMOUNT, limit, depositAmount);

        (uint256 consumed,) = harness.getTestUsage();
        // After crossing boundary: consumed should equal the excess
        assertEq(consumed, excessAmount);
    }

    /// @notice Property 3b: Two deposits crossing boundary have same result as single
    /// First deposit fills remaining, second deposit equals excess -> same final state
    function testFuzz_Property3b_SplitDepositsSameAsingle(uint256 initialConsumed, uint256 excessAmount) public {
        uint256 limit = MAX_TOTAL;

        // Start with some consumed amount
        initialConsumed = bound(initialConsumed, limit / 4, limit * 3 / 4);
        uint256 remaining = limit - initialConsumed;
        vm.assume(remaining >= MIN_AMOUNT);

        // Excess is how much goes into the new period
        excessAmount = bound(excessAmount, MIN_AMOUNT, limit);

        uint256 startTime = 1000;
        vm.warp(startTime);
        harness.setTestUsage(initialConsumed, startTime);

        // Move past reset window
        vm.warp(startTime + 1 days + 1);

        // Split: first deposit fills exactly to limit
        harness.exposed_checkInLimits(MIN_AMOUNT, limit, remaining);

        (uint256 consumedAfterFirst,) = harness.getTestUsage();
        assertEq(consumedAfterFirst, limit); // Exactly at limit

        // Second deposit is the excess amount (triggers reset)
        harness.exposed_checkInLimits(MIN_AMOUNT, limit, excessAmount);

        (uint256 finalConsumed,) = harness.getTestUsage();
        // Final state should be same as single deposit: excess
        assertEq(finalConsumed, excessAmount);
    }

    /// @notice Property 3c: Three-way split has same result
    /// Split total into: partial fill + remaining fill + excess
    function testFuzz_Property3c_ThreeWaySplitSameResult(
        uint256 initialConsumed,
        uint256 partialFill,
        uint256 excessAmount
    ) public {
        uint256 limit = MAX_TOTAL;

        // Start with some consumed
        initialConsumed = bound(initialConsumed, 0, limit / 2);
        uint256 remaining = limit - initialConsumed;

        // Partial fill is part of the remaining capacity
        partialFill = bound(partialFill, MIN_AMOUNT, remaining / 2);
        uint256 restOfRemaining = remaining - partialFill;
        vm.assume(restOfRemaining >= MIN_AMOUNT);

        // Excess goes to new period
        excessAmount = bound(excessAmount, MIN_AMOUNT, limit);

        uint256 startTime = 1000;
        vm.warp(startTime);
        harness.setTestUsage(initialConsumed, startTime);

        // Move past reset window
        vm.warp(startTime + 1 days + 1);

        // Deposit 1: partial fill (stays within limit)
        harness.exposed_checkInLimits(MIN_AMOUNT, limit, partialFill);

        // Deposit 2: rest of remaining (hits exactly limit)
        harness.exposed_checkInLimits(MIN_AMOUNT, limit, restOfRemaining);

        (uint256 consumedAtLimit,) = harness.getTestUsage();
        assertEq(consumedAtLimit, limit);

        // Deposit 3: excess (triggers reset)
        harness.exposed_checkInLimits(MIN_AMOUNT, limit, excessAmount);

        (uint256 finalConsumed,) = harness.getTestUsage();
        assertEq(finalConsumed, excessAmount);
    }

    /// @notice Property 4: Reverts if amount < minAmount
    function testFuzz_Property4_RevertsIfBelowMinAmount(uint256 minAmount, uint256 amount) public {
        minAmount = bound(minAmount, 2, 100e18);
        amount = bound(amount, 0, minAmount - 1);

        harness.setTestUsage(0, block.timestamp);

        vm.expectRevert(Bridge.InvalidTokenAmount.selector);
        harness.exposed_checkInLimits(minAmount, MAX_TOTAL, amount);
    }
}
