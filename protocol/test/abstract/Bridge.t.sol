// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {PodTest} from "pod-sdk/test/podTest.sol";
import {Bridge} from "../../src/Bridge.sol";
import {IBridge} from "../../src/interfaces/IBridge.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

abstract contract BridgeBehaviorTest is PodTest {
    address public admin = makeAddr("admin");
    address public user = makeAddr("user");
    address public newBridge = makeAddr("newBridge");

    uint256 public constant INITIAL_BALANCE = 1000e18;
    uint256 public constant DEPOSIT_AMOUNT = 100e18;

    uint256 public minAmount;
    uint256 public depositLimit;
    uint256 public claimLimit;

    uint256 public nativeMinAmount;
    uint256 public nativeDepositLimit;
    uint256 public nativeClaimLimit;

    address public constant MOCK_ADDRESS_FOR_NATIVE_DEPOSIT =
        address(uint160(uint256(keccak256("MOCK_ADDRESS_FOR_NATIVE_DEPOSIT"))));

    // Hooks each concrete suite must implement
    function bridge() internal view virtual returns (Bridge);
    function token() internal view virtual returns (IERC20);
    function setUpSuite() public virtual;

    function setUp() public virtual {
        minAmount = 1e18;
        depositLimit = 500e18;
        claimLimit = 400e18;

        nativeMinAmount = 0.01 ether;
        nativeDepositLimit = 500e18;
        nativeClaimLimit = 400e18;
        setUpSuite();
    }

    // Common tests
    function test_Deposit_EmitsEvent() public {
        vm.prank(user);
        vm.expectEmit(true, true, true, true);
        emit IBridge.Deposit(bytes32(uint256(0)), address(token()), DEPOSIT_AMOUNT, user);
        bridge().deposit(address(token()), DEPOSIT_AMOUNT, user, "");
    }

    function test_Deposit_RevertIfPaused() public {
        vm.prank(admin);
        bridge().pause();
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vm.prank(user);
        bridge().deposit(address(token()), DEPOSIT_AMOUNT, user, "");
    }

    function test_Deposit_MinAndDailyLimit() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(IBridge.InvalidTokenAmount.selector));
        bridge().deposit(address(token()), minAmount - 1, user, "");

        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(IBridge.DailyLimitExhausted.selector));
        bridge().deposit(address(token()), depositLimit + 1, user, "");
    }

    function test_Deposit_Pause() public {
        vm.prank(admin);
        bridge().pause();
        vm.prank(user);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        bridge().deposit(address(token()), DEPOSIT_AMOUNT, user, "");
    }

    function test_ConfigureToken() public {
        uint256 newMin = 2e18;
        uint256 newDeposit = 2000e18;
        uint256 newClaim = 2000e18;
        vm.prank(admin);
        bridge().configureToken(address(token()), newMin, newDeposit, newClaim);
        (uint256 tokenMinAmount, uint256 tokenDepositLimit, uint256 tokenClaimLimit,,,) =
            bridge().tokenData(address(token()));
        assertEq(tokenMinAmount, newMin);
        assertEq(tokenDepositLimit, newDeposit);
        assertEq(tokenClaimLimit, newClaim);
    }

    function test_ConfigureToken_RevertIfNotAdmin() public {
        vm.prank(user);
        vm.expectRevert();
        bridge().configureToken(address(token()), 2e18, 2000e18, 2000e18);
    }

    function test_Pause_Unpause() public {
        vm.prank(admin);
        bridge().pause();
        assertTrue(bridge().paused());
        vm.prank(admin);
        bridge().unpause();
        assertFalse(bridge().paused());
    }

    function test_Pause_RevertIfNotPauseRole() public {
        vm.prank(user);
        vm.expectRevert();
        bridge().pause();
    }

    function test_Migrate_SetsMigratedContract() public {
        vm.prank(admin);
        bridge().pause();
        vm.prank(admin);
        bridge().migrate(newBridge);
        assertEq(bridge().migratedContract(), newBridge);
    }

    function test_Deposit_ExactlyAtMinAndLimit() public {
        vm.prank(user);
        bridge().deposit(address(token()), minAmount, user, "");
        vm.prank(user);
        bridge().deposit(address(token()), depositLimit - minAmount, user, "");
    }

    function test_Deposit_MultipleSameDay_TracksConsumed() public {
        vm.prank(user);
        bridge().deposit(address(token()), 100e18, user, "");
        vm.prank(user);
        bridge().deposit(address(token()), 200e18, user, "");
        (,,, IBridge.TokenUsage memory dep,,) = bridge().tokenData(address(token()));
        assertEq(dep.consumed, 300e18);
    }

    function test_Deposit_DailyLimitResets_AfterOneDayOnly() public {
        vm.prank(user);
        bridge().deposit(address(token()), depositLimit, user, "");
        vm.warp(block.timestamp + 1 days - 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(IBridge.DailyLimitExhausted.selector));
        bridge().deposit(address(token()), minAmount, user, "");
        vm.warp(block.timestamp + 2);
        vm.prank(user);
        bridge().deposit(address(token()), depositLimit, user, "");
    }

    function test_Deposit_RevertIfTokenNotWhitelisted() public {
        address notWhitelisted = address(0xBEEF);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(IBridge.InvalidTokenConfig.selector));
        bridge().deposit(notWhitelisted, 1, user, "");
    }

    function test_Migrate_RevertIfAlreadyMigrated() public {
        vm.startPrank(admin);
        bridge().pause();
        bridge().migrate(newBridge);
        vm.expectRevert(abi.encodeWithSelector(IBridge.ContractMigrated.selector));
        bridge().migrate(address(0x1234));
        vm.stopPrank();
    }

    function test_Deposit_RevertAfterMigrated() public {
        vm.startPrank(admin);
        bridge().pause();
        bridge().migrate(newBridge);
        vm.stopPrank();
        vm.prank(user);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        bridge().deposit(address(token()), 1, user, "");
    }

    function test_Pause_RoleRequired_Unpause_AdminRequired() public {
        vm.prank(user);
        vm.expectRevert();
        bridge().pause();
        vm.prank(admin);
        bridge().pause();
        vm.prank(user);
        vm.expectRevert();
        bridge().unpause();
    }

    function test_ConfigureToken_RevertIfUpdatingUnconfiguredToken() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(IBridge.InvalidTokenConfig.selector));
        bridge().configureToken(address(0xCAFE), 1, 1, 1);
    }

    function test_Deposit_SkipsDailyLimit_WhenDepositCapZero() public {
        vm.prank(admin);
        bridge().configureToken(address(token()), minAmount, 0, claimLimit);

        vm.prank(user);
        vm.expectRevert();
        bridge().deposit(address(token()), minAmount, user, "");
    }

    function test_RoleGrants_FromConstructor() public view {
        assertTrue(bridge().hasRole(bridge().DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(bridge().hasRole(bridge().PAUSER_ROLE(), admin));
    }

    function test_ConfigureToken_ResetsDailyLimits() public {
        vm.prank(user);
        bridge().deposit(address(token()), minAmount, user, "");
        (,,, IBridge.TokenUsage memory dep,,) = bridge().tokenData(address(token()));
        assertEq(dep.consumed, minAmount);
        vm.prank(admin);
        bridge().configureToken(address(token()), minAmount, depositLimit, claimLimit);
        (,,, IBridge.TokenUsage memory dep2,,) = bridge().tokenData(address(token()));
        assertEq(dep2.consumed, 0);
        vm.prank(user);
        bridge().deposit(address(token()), minAmount, user, "");
    }

    function test_ConfigureToken_DisableToken() public {
        vm.prank(user);
        bridge().deposit(address(token()), minAmount, user, "");
        vm.prank(admin);
        bridge().configureToken(address(token()), 1e18, 0, 0);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(IBridge.DailyLimitExhausted.selector));
        bridge().deposit(address(token()), minAmount, user, "");
    }
}
