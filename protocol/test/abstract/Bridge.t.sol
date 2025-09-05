// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {PodTest} from "pod-sdk/test/podTest.sol";
import {Bridge} from "../../src/abstract/Bridge.sol";
import {IBridge} from "../../src/interfaces/IBridge.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

abstract contract BridgeBehaviorTest is PodTest {
    address public admin = makeAddr("admin");
    address public user = makeAddr("user");
    address public recipient = makeAddr("recipient");
    address public newBridge = makeAddr("newBridge");

    uint256 public constant INITIAL_BALANCE = 1000e18;
    uint256 public constant DEPOSIT_AMOUNT = 100e18;

    IBridge.TokenLimits public tokenLimits;

    // Hooks each concrete suite must implement
    function bridge() internal view virtual returns (Bridge);
    function token() internal view virtual returns (IERC20);
    function setUpSuite() public virtual;

    function setUp() public virtual {
        tokenLimits = IBridge.TokenLimits({minAmount: 1e18, deposit: 500e18, claim: 400e18});
        setUpSuite();
    }

    // Common tests
    function test_Deposit_EmitsEvent() public {
        vm.prank(user);
        vm.expectEmit(true, true, false, true);
        emit IBridge.Deposit(0, address(token()), DEPOSIT_AMOUNT, recipient);
        bridge().deposit(address(token()), DEPOSIT_AMOUNT, recipient);
    }

    function test_Deposit_MinAndDailyLimit() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(IBridge.InvalidTokenAmount.selector));
        bridge().deposit(address(token()), tokenLimits.minAmount - 1, recipient);

        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(IBridge.DailyLimitExhausted.selector));
        bridge().deposit(address(token()), tokenLimits.deposit + 1, recipient);
    }

    function test_Deposit_ZeroRecipientAndPause() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(IBridge.InvalidToAddress.selector));
        bridge().deposit(address(token()), DEPOSIT_AMOUNT, address(0));

        vm.prank(admin);
        bridge().pause();
        vm.prank(user);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        bridge().deposit(address(token()), DEPOSIT_AMOUNT, recipient);
    }

    function test_ConfigureToken() public {
        IBridge.TokenLimits memory nl = IBridge.TokenLimits({minAmount: 2e18, deposit: 2000e18, claim: 2000e18});
        vm.prank(admin);
        bridge().configureToken(address(token()), nl);
        (IBridge.TokenLimits memory limits,,) = bridge().tokenData(address(token()));
        assertEq(limits.minAmount, nl.minAmount);
        assertEq(limits.deposit, nl.deposit);
        assertEq(limits.claim, nl.claim);
    }

    function test_ConfigureToken_RevertIfNotAdmin() public {
        IBridge.TokenLimits memory nl = IBridge.TokenLimits({minAmount: 2e18, deposit: 2000e18, claim: 2000e18});
        vm.prank(user);
        vm.expectRevert();
        bridge().configureToken(address(token()), nl);
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
        bridge().deposit(address(token()), tokenLimits.minAmount, recipient);
        vm.prank(user);
        bridge().deposit(address(token()), tokenLimits.deposit - tokenLimits.minAmount, recipient);
    }

    function test_Deposit_MultipleSameDay_TracksConsumed() public {
        vm.prank(user);
        bridge().deposit(address(token()), 100e18, recipient);
        vm.prank(user);
        bridge().deposit(address(token()), 200e18, recipient);
        (, IBridge.TokenUsage memory dep,) = bridge().tokenData(address(token()));
        assertEq(dep.consumed, 300e18);
    }

    function test_Deposit_DailyLimitResets_AfterOneDayOnly() public {
        vm.prank(user);
        bridge().deposit(address(token()), tokenLimits.deposit, recipient);
        vm.warp(block.timestamp + 1 days - 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(IBridge.DailyLimitExhausted.selector));
        bridge().deposit(address(token()), tokenLimits.minAmount, recipient);
        vm.warp(block.timestamp + 2);
        vm.prank(user);
        bridge().deposit(address(token()), tokenLimits.deposit, recipient);
    }

    function test_Deposit_RevertIfTokenNotWhitelisted() public {
        address notWhitelisted = address(0xBEEF);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(IBridge.InvalidTokenAmount.selector));
        bridge().deposit(notWhitelisted, 1, recipient);
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
        bridge().deposit(address(token()), 1, recipient);
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
        IBridge.TokenLimits memory some = IBridge.TokenLimits({minAmount: 1, deposit: 1, claim: 1});
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(IBridge.InvalidTokenConfig.selector));
        bridge().configureToken(address(0xCAFE), some);
    }

    function test_Deposit_SkipsDailyLimit_WhenDepositCapZero() public {
        IBridge.TokenLimits memory unlimited =
            IBridge.TokenLimits({minAmount: tokenLimits.minAmount, deposit: 0, claim: tokenLimits.claim});
        vm.prank(admin);
        bridge().configureToken(address(token()), unlimited);

        vm.prank(user);
        vm.expectRevert();
        bridge().deposit(address(token()), tokenLimits.minAmount, recipient);
    }

    function test_DepositIndex_IncrementsSequentially() public {
        uint256 beforeIdx = bridge().depositIndex();
        vm.prank(user);
        bridge().deposit(address(token()), tokenLimits.minAmount, recipient);
        assertEq(bridge().depositIndex(), beforeIdx + 1);

        vm.prank(user);
        bridge().deposit(address(token()), tokenLimits.minAmount, recipient);
        assertEq(bridge().depositIndex(), beforeIdx + 2);
    }

    function test_RoleGrants_FromConstructor() public view {
        assertTrue(bridge().hasRole(bridge().DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(bridge().hasRole(bridge().PAUSER_ROLE(), admin));
    }

    function test_ConfigureToken_ResetsDailyLimits() public {
        vm.prank(user);
        bridge().deposit(address(token()), tokenLimits.minAmount, recipient);
        (, IBridge.TokenUsage memory dep,) = bridge().tokenData(address(token()));
        assertEq(dep.consumed, tokenLimits.minAmount);
        vm.prank(admin);
        bridge().configureToken(address(token()), tokenLimits);
        (, IBridge.TokenUsage memory dep2,) = bridge().tokenData(address(token()));
        assertEq(dep2.consumed, 0);
        vm.prank(user);
        bridge().deposit(address(token()), tokenLimits.minAmount, recipient);
    }

    function test_ConfigureToken_DisableToken() public {
        vm.prank(user);
        bridge().deposit(address(token()), tokenLimits.minAmount, recipient);
        vm.prank(admin);
        bridge().configureToken(address(token()), IBridge.TokenLimits({minAmount: 1e18, deposit: 0, claim: 0}));
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(IBridge.DailyLimitExhausted.selector));
        bridge().deposit(address(token()), tokenLimits.minAmount, recipient);
    }
}
