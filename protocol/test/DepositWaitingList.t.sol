// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Bridge} from "../src/Bridge.sol";
import {DepositWaitingList} from "../src/DepositWaitingList.sol";
import {WrappedToken} from "../src/WrappedToken.sol";
import {BridgeDeployer} from "../script/DeployBridge.s.sol";

contract DepositWaitingListTest is Test {
    Bridge internal _bridge;
    WrappedToken internal _token;
    DepositWaitingList internal _waitingList;

    address public admin = makeAddr("admin");
    address public user = makeAddr("user");
    address public user2 = makeAddr("user2");
    address public relayer = makeAddr("relayer");
    address public callContract = makeAddr("callContract");

    uint256 public constant INITIAL_BALANCE = 10_000e18;
    uint256 public constant DEPOSIT_AMOUNT = 100e18;
    uint256 constant NUMBER_OF_VALIDATORS = 4;
    uint256 constant SRC_CHAIN_ID = 0x50d;

    uint256 public minAmount = 1e18;
    uint256 public depositLimit = 500e18;
    uint256 public claimLimit = 400e18;

    address immutable MIRROR_TOKEN = makeAddr("mirrorToken");

    function setUp() public {
        vm.startPrank(admin);

        // Deploy bridge
        uint8 f = uint8((NUMBER_OF_VALIDATORS - 1) / 3);
        address[] memory initialValidators = new address[](NUMBER_OF_VALIDATORS);
        for (uint256 i = 0; i < NUMBER_OF_VALIDATORS; i++) {
            initialValidators[i] = vm.addr(i + 1);
        }
        address otherBridgeContract = makeAddr("otherBridgeContract");
        (_bridge,) =
            BridgeDeployer.deploy(otherBridgeContract, SRC_CHAIN_ID, admin, initialValidators, f, 1, bytes32(0));

        // Configure bridge: Private mode (default), whitelist token and callContract
        _token = new WrappedToken("TestToken", "TKN", 18);
        _bridge.whiteListToken(address(_token), MIRROR_TOKEN, minAmount, depositLimit, claimLimit);
        _bridge.setCallContractWhitelist(callContract, true);

        // Deploy waiting list
        _waitingList = new DepositWaitingList(address(_bridge), callContract, admin);

        // Grant waiting list RELAYER_ROLE on the bridge
        _bridge.grantRole(_bridge.RELAYER_ROLE(), address(_waitingList));

        // Grant relayer RELAYER_ROLE on the waiting list
        _waitingList.grantRole(_waitingList.RELAYER_ROLE(), relayer);

        // Mint tokens
        _token.mint(user, INITIAL_BALANCE);
        _token.mint(user2, INITIAL_BALANCE);

        vm.stopPrank();

        // Users approve the waiting list
        vm.prank(user);
        _token.approve(address(_waitingList), type(uint256).max);
        vm.prank(user2);
        _token.approve(address(_waitingList), type(uint256).max);
    }

    // ========== Deposit Tests ==========

    function test_Deposit_Success() public {
        vm.prank(user);
        uint256 id = _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user);
        assertEq(id, 0);

        (address token, uint256 amount, address from, address to, bool applied) = _waitingList.deposits(0);
        assertEq(token, address(_token));
        assertEq(amount, DEPOSIT_AMOUNT);
        assertEq(from, user);
        assertEq(to, user);
        assertFalse(applied);
    }

    function test_Deposit_SequentialIds() public {
        vm.startPrank(user);
        uint256 id0 = _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user);
        uint256 id1 = _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user);
        uint256 id2 = _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user);
        vm.stopPrank();

        assertEq(id0, 0);
        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(_waitingList.nextDepositId(), 3);
    }

    function test_Deposit_EmitsEvent() public {
        vm.prank(user);
        vm.expectEmit(true, true, true, true);
        emit DepositWaitingList.WaitingDepositCreated(0, user, user, address(_token), DEPOSIT_AMOUNT);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user);
    }

    function test_Deposit_RevertOnZeroAddress() public {
        vm.prank(user);
        vm.expectRevert(DepositWaitingList.InvalidToAddress.selector);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, address(0));
    }

    function test_Deposit_RevertOnZeroAmount() public {
        vm.prank(user);
        vm.expectRevert(DepositWaitingList.InvalidAmount.selector);
        _waitingList.deposit(address(_token), 0, user);
    }

    function test_Deposit_TransfersTokens() public {
        uint256 userBefore = _token.balanceOf(user);
        uint256 wlBefore = _token.balanceOf(address(_waitingList));

        vm.prank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user);

        assertEq(_token.balanceOf(user), userBefore - DEPOSIT_AMOUNT);
        assertEq(_token.balanceOf(address(_waitingList)), wlBefore + DEPOSIT_AMOUNT);
    }

    function test_Deposit_MultipleUsers() public {
        vm.prank(user);
        uint256 id0 = _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user);
        vm.prank(user2);
        uint256 id1 = _waitingList.deposit(address(_token), DEPOSIT_AMOUNT * 2, user2);

        assertEq(id0, 0);
        assertEq(id1, 1);

        (, uint256 amount0, address from0,,) = _waitingList.deposits(0);
        (, uint256 amount1, address from1,,) = _waitingList.deposits(1);
        assertEq(from0, user);
        assertEq(amount0, DEPOSIT_AMOUNT);
        assertEq(from1, user2);
        assertEq(amount1, DEPOSIT_AMOUNT * 2);
    }

    function test_Deposit_DifferentRecipient() public {
        vm.prank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user2);

        (,, address from, address to,) = _waitingList.deposits(0);
        assertEq(from, user);
        assertEq(to, user2);
    }

    // ========== Apply Tests ==========

    function test_Apply_Single() public {
        vm.prank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user);

        uint256[] memory ids = new uint256[](1);
        ids[0] = 0;

        vm.prank(relayer);
        _waitingList.applyDeposits(address(_token), ids);

        (,,,, bool applied) = _waitingList.deposits(0);
        assertTrue(applied);

        // Tokens should have moved from waiting list to bridge
        assertEq(_token.balanceOf(address(_waitingList)), 0);
        assertEq(_token.balanceOf(address(_bridge)), DEPOSIT_AMOUNT);
    }

    function test_Apply_Batch() public {
        vm.startPrank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT * 2, user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user2);
        vm.stopPrank();

        uint256[] memory ids = new uint256[](3);
        ids[0] = 0;
        ids[1] = 1;
        ids[2] = 2;

        vm.prank(relayer);
        _waitingList.applyDeposits(address(_token), ids);

        for (uint256 i = 0; i < 3; i++) {
            (,,,, bool applied) = _waitingList.deposits(i);
            assertTrue(applied);
        }

        assertEq(_token.balanceOf(address(_waitingList)), 0);
        assertEq(_token.balanceOf(address(_bridge)), DEPOSIT_AMOUNT * 4);
    }

    function test_Apply_EmitsEvents() public {
        vm.prank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user);

        uint256[] memory ids = new uint256[](1);
        ids[0] = 0;

        vm.prank(relayer);
        vm.expectEmit(true, true, true, true);
        emit DepositWaitingList.WaitingDepositApplied(0);
        _waitingList.applyDeposits(address(_token), ids);
    }

    function test_Apply_RevertIfNotRelayer() public {
        vm.prank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user);

        uint256[] memory ids = new uint256[](1);
        ids[0] = 0;

        vm.prank(user);
        vm.expectRevert();
        _waitingList.applyDeposits(address(_token), ids);
    }

    function test_Apply_RevertIfAlreadyApplied() public {
        vm.prank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user);

        uint256[] memory ids = new uint256[](1);
        ids[0] = 0;

        vm.prank(relayer);
        _waitingList.applyDeposits(address(_token), ids);

        vm.prank(relayer);
        vm.expectRevert(DepositWaitingList.DepositAlreadyApplied.selector);
        _waitingList.applyDeposits(address(_token), ids);
    }

    function test_Apply_RevertIfNonexistent() public {
        uint256[] memory ids = new uint256[](1);
        ids[0] = 999;

        vm.prank(relayer);
        vm.expectRevert(DepositWaitingList.DepositDoesNotExist.selector);
        _waitingList.applyDeposits(address(_token), ids);
    }

    function test_Apply_RevertIfBridgeLimitHit() public {
        // Deposit more than the bridge daily limit
        vm.prank(user);
        _waitingList.deposit(address(_token), depositLimit + minAmount, user);

        uint256[] memory ids = new uint256[](1);
        ids[0] = 0;

        vm.prank(relayer);
        vm.expectRevert(Bridge.DailyLimitExhausted.selector);
        _waitingList.applyDeposits(address(_token), ids);

        // Deposit should NOT be marked as applied since the tx reverted
        (,,,, bool applied) = _waitingList.deposits(0);
        assertFalse(applied);
    }

    function test_Apply_OutOfOrder() public {
        vm.startPrank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user);
        vm.stopPrank();

        // Apply in reverse order
        uint256[] memory ids = new uint256[](2);
        ids[0] = 2;
        ids[1] = 0;

        vm.prank(relayer);
        _waitingList.applyDeposits(address(_token), ids);

        (,,,, bool applied0) = _waitingList.deposits(0);
        (,,,, bool applied1) = _waitingList.deposits(1);
        (,,,, bool applied2) = _waitingList.deposits(2);
        assertTrue(applied0);
        assertFalse(applied1);
        assertTrue(applied2);
    }

    // ========== Token Mismatch Tests ==========

    function test_Apply_RevertIfTokenMismatch() public {
        // Create a second token
        vm.startPrank(admin);
        WrappedToken token2 = new WrappedToken("Token2", "TK2", 18);
        token2.mint(user, INITIAL_BALANCE);
        _bridge.whiteListToken(address(token2), makeAddr("mirrorToken2"), minAmount, depositLimit, claimLimit);
        vm.stopPrank();

        vm.startPrank(user);
        token2.approve(address(_waitingList), type(uint256).max);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user);
        _waitingList.deposit(address(token2), DEPOSIT_AMOUNT, user);
        vm.stopPrank();

        uint256[] memory ids = new uint256[](2);
        ids[0] = 0;
        ids[1] = 1;

        vm.prank(relayer);
        vm.expectRevert(DepositWaitingList.TokenMismatch.selector);
        _waitingList.applyDeposits(address(_token), ids);
    }

    // ========== Rescue Tests ==========

    function test_RescueTokens_AdminCanRescue() public {
        vm.prank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user);

        uint256 adminBefore = _token.balanceOf(admin);

        vm.prank(admin);
        _waitingList.rescueTokens(address(_token), admin, DEPOSIT_AMOUNT);

        assertEq(_token.balanceOf(admin), adminBefore + DEPOSIT_AMOUNT);
        assertEq(_token.balanceOf(address(_waitingList)), 0);
    }

    function test_RescueTokens_RevertIfNotAdmin() public {
        vm.prank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user);

        vm.prank(user);
        vm.expectRevert();
        _waitingList.rescueTokens(address(_token), user, DEPOSIT_AMOUNT);
    }

    // ========== Config Tests ==========

    function test_SetCallContract() public {
        address newCallContract = makeAddr("newCallContract");

        vm.prank(admin);
        _waitingList.setCallContract(newCallContract);

        assertEq(_waitingList.callContract(), newCallContract);
    }

    function test_SetCallContract_RevertIfNotAdmin() public {
        vm.prank(user);
        vm.expectRevert();
        _waitingList.setCallContract(makeAddr("newCallContract"));
    }

    // ========== Bridge Interaction Tests ==========

    function test_Apply_BridgeDepositIndexIncrements() public {
        uint256 bridgeIndexBefore = _bridge.depositIndex();

        vm.startPrank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user);
        vm.stopPrank();

        uint256[] memory ids = new uint256[](2);
        ids[0] = 0;
        ids[1] = 1;

        vm.prank(relayer);
        _waitingList.applyDeposits(address(_token), ids);

        assertEq(_bridge.depositIndex(), bridgeIndexBefore + 2);
    }

    function test_Apply_WorksInPublicMode() public {
        vm.prank(admin);
        _bridge.setState(Bridge.ContractState.Public);

        vm.prank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user);

        uint256[] memory ids = new uint256[](1);
        ids[0] = 0;

        vm.prank(relayer);
        _waitingList.applyDeposits(address(_token), ids);

        (,,,, bool applied) = _waitingList.deposits(0);
        assertTrue(applied);
    }

    function test_Apply_RevertIfBridgePaused() public {
        vm.prank(admin);
        _bridge.setState(Bridge.ContractState.Paused);

        vm.prank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user);

        uint256[] memory ids = new uint256[](1);
        ids[0] = 0;

        vm.prank(relayer);
        vm.expectRevert(Bridge.ContractPaused.selector);
        _waitingList.applyDeposits(address(_token), ids);
    }
}
