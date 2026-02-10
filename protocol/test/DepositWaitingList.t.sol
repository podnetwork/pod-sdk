// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Bridge} from "../src/Bridge.sol";
import {DepositWaitingList} from "../src/DepositWaitingList.sol";
import {WrappedToken} from "../src/WrappedToken.sol";
import {MockERC20Permit} from "./mocks/MockERC20Permit.sol";
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
        uint256 id = _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");
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
        uint256 id0 = _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");
        uint256 id1 = _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");
        uint256 id2 = _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");
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
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");
    }

    function test_Deposit_RevertOnZeroAddress() public {
        vm.prank(user);
        vm.expectRevert(DepositWaitingList.InvalidToAddress.selector);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, address(0), "");
    }

    function test_Deposit_RevertOnZeroAmount() public {
        vm.prank(user);
        vm.expectRevert(DepositWaitingList.InvalidAmount.selector);
        _waitingList.deposit(address(_token), 0, user, "");
    }

    function test_Deposit_TransfersTokens() public {
        uint256 userBefore = _token.balanceOf(user);
        uint256 wlBefore = _token.balanceOf(address(_waitingList));

        vm.prank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");

        assertEq(_token.balanceOf(user), userBefore - DEPOSIT_AMOUNT);
        assertEq(_token.balanceOf(address(_waitingList)), wlBefore + DEPOSIT_AMOUNT);
    }

    function test_Deposit_MultipleUsers() public {
        vm.prank(user);
        uint256 id0 = _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");
        vm.prank(user2);
        uint256 id1 = _waitingList.deposit(address(_token), DEPOSIT_AMOUNT * 2, user2, "");

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
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user2, "");

        (,, address from, address to,) = _waitingList.deposits(0);
        assertEq(from, user);
        assertEq(to, user2);
    }

    // ========== Apply Tests ==========

    function test_Apply_Single() public {
        vm.prank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");

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
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT * 2, user, "");
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user2, "");
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
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");

        uint256[] memory ids = new uint256[](1);
        ids[0] = 0;

        vm.prank(relayer);
        vm.expectEmit(true, true, true, true);
        emit DepositWaitingList.WaitingDepositApplied(0);
        _waitingList.applyDeposits(address(_token), ids);
    }

    function test_Apply_RevertIfNotRelayer() public {
        vm.prank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");

        uint256[] memory ids = new uint256[](1);
        ids[0] = 0;

        vm.prank(user);
        vm.expectRevert();
        _waitingList.applyDeposits(address(_token), ids);
    }

    function test_Apply_RevertIfAlreadyApplied() public {
        vm.prank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");

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
        _waitingList.deposit(address(_token), depositLimit + minAmount, user, "");

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
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");
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
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");
        _waitingList.deposit(address(token2), DEPOSIT_AMOUNT, user, "");
        vm.stopPrank();

        uint256[] memory ids = new uint256[](2);
        ids[0] = 0;
        ids[1] = 1;

        vm.prank(relayer);
        vm.expectRevert(DepositWaitingList.TokenMismatch.selector);
        _waitingList.applyDeposits(address(_token), ids);
    }

    // ========== Withdraw Tests ==========

    function test_Withdraw_BySender() public {
        vm.prank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user2, "");

        uint256 userBefore = _token.balanceOf(user);

        vm.prank(user);
        _waitingList.withdraw(0);

        assertEq(_token.balanceOf(user), userBefore + DEPOSIT_AMOUNT);
        assertEq(_token.balanceOf(address(_waitingList)), 0);

        (,,,, bool applied) = _waitingList.deposits(0);
        assertTrue(applied);
    }

    function test_Withdraw_ByRelayer() public {
        vm.prank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user2, "");

        uint256 userBefore = _token.balanceOf(user);

        vm.prank(relayer);
        _waitingList.withdraw(0);

        // Tokens go back to the original sender, not the relayer
        assertEq(_token.balanceOf(user), userBefore + DEPOSIT_AMOUNT);
    }

    function test_Withdraw_EmitsEvent() public {
        vm.prank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");

        vm.prank(user);
        vm.expectEmit(true, true, true, true);
        emit DepositWaitingList.WaitingDepositWithdrawn(0);
        _waitingList.withdraw(0);
    }

    function test_Withdraw_RevertIfNotAuthorized() public {
        vm.prank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");

        vm.prank(user2);
        vm.expectRevert(DepositWaitingList.NotAuthorized.selector);
        _waitingList.withdraw(0);
    }

    function test_Withdraw_RevertIfAlreadyApplied() public {
        vm.prank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");

        uint256[] memory ids = new uint256[](1);
        ids[0] = 0;
        vm.prank(relayer);
        _waitingList.applyDeposits(address(_token), ids);

        vm.prank(user);
        vm.expectRevert(DepositWaitingList.DepositAlreadyApplied.selector);
        _waitingList.withdraw(0);
    }

    function test_Withdraw_RevertIfAlreadyWithdrawn() public {
        vm.prank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");

        vm.prank(user);
        _waitingList.withdraw(0);

        vm.prank(user);
        vm.expectRevert(DepositWaitingList.DepositAlreadyApplied.selector);
        _waitingList.withdraw(0);
    }

    function test_Withdraw_RevertIfNonexistent() public {
        vm.prank(user);
        vm.expectRevert(DepositWaitingList.DepositDoesNotExist.selector);
        _waitingList.withdraw(999);
    }

    // ========== Fuzz Tests ==========

    function _createDepositsAndApplyWithdraw(
        uint256 numDeposits,
        uint256 totalAmount,
        uint256 numApplied,
        uint256 numWithdrawn,
        uint256 targetIndex
    ) internal returns (uint256 perAmount) {
        numDeposits = bound(numDeposits, 2, 10);
        totalAmount = bound(totalAmount, numDeposits * minAmount, numDeposits * depositLimit);
        perAmount = totalAmount / numDeposits;
        targetIndex = bound(targetIndex, 0, numDeposits - 1);

        // Bound numApplied so (numApplied + 1) * perAmount <= depositLimit (room for target apply)
        uint256 maxApplies = depositLimit / perAmount;
        if (maxApplies > 0) maxApplies--;
        uint256 maxConsumed = numDeposits - 1;
        numApplied = bound(numApplied, 0, maxApplies < maxConsumed ? maxApplies : maxConsumed);
        numWithdrawn = bound(numWithdrawn, 0, maxConsumed - numApplied);

        for (uint256 i = 0; i < numDeposits; i++) {
            vm.prank(i % 2 == 0 ? user : user2);
            _waitingList.deposit(address(_token), perAmount, user, "");
        }

        if (numApplied > 0) {
            uint256[] memory applyIds = new uint256[](numApplied);
            uint256 idx;
            for (uint256 i = 0; i < numDeposits && idx < numApplied; i++) {
                if (i == targetIndex) continue;
                applyIds[idx++] = i;
            }
            vm.prank(relayer);
            _waitingList.applyDeposits(address(_token), applyIds);
        }

        uint256 withdrawn;
        for (uint256 i = 0; i < numDeposits && withdrawn < numWithdrawn; i++) {
            if (i == targetIndex) continue;
            (,,,, bool applied) = _waitingList.deposits(i);
            if (applied) continue;
            (,, address from,,) = _waitingList.deposits(i);
            vm.prank(from);
            _waitingList.withdraw(i);
            withdrawn++;
        }
    }

    function testFuzz_Withdraw_PendingDeposit(
        uint256 numDeposits,
        uint256 totalAmount,
        uint256 numWithdrawn,
        uint256 numApplied,
        uint256 targetIndex
    ) public {
        uint256 perAmount = _createDepositsAndApplyWithdraw(
            numDeposits, totalAmount, numApplied, numWithdrawn, targetIndex
        );
        targetIndex = bound(targetIndex, 0, bound(numDeposits, 2, 10) - 1);

        (,, address depositor,,) = _waitingList.deposits(targetIndex);
        uint256 senderBefore = _token.balanceOf(depositor);

        vm.prank(depositor);
        _waitingList.withdraw(targetIndex);

        assertEq(_token.balanceOf(depositor), senderBefore + perAmount);
        (,,,, bool applied) = _waitingList.deposits(targetIndex);
        assertTrue(applied);
    }

    function testFuzz_Withdraw_RevertIfAlreadyApplied(
        uint256 numDeposits,
        uint256 totalAmount,
        uint256 numWithdrawn,
        uint256 numApplied,
        uint256 targetIndex
    ) public {
        _createDepositsAndApplyWithdraw(numDeposits, totalAmount, numApplied, numWithdrawn, targetIndex);
        targetIndex = bound(targetIndex, 0, bound(numDeposits, 2, 10) - 1);

        (,, address depositor,,) = _waitingList.deposits(targetIndex);

        uint256[] memory ids = new uint256[](1);
        ids[0] = targetIndex;
        vm.prank(relayer);
        _waitingList.applyDeposits(address(_token), ids);

        vm.prank(depositor);
        vm.expectRevert(DepositWaitingList.DepositAlreadyApplied.selector);
        _waitingList.withdraw(targetIndex);
    }

    function testFuzz_Withdraw_RevertIfAlreadyWithdrawn(
        uint256 numDeposits,
        uint256 totalAmount,
        uint256 numWithdrawn,
        uint256 numApplied,
        uint256 targetIndex
    ) public {
        _createDepositsAndApplyWithdraw(numDeposits, totalAmount, numApplied, numWithdrawn, targetIndex);
        targetIndex = bound(targetIndex, 0, bound(numDeposits, 2, 10) - 1);

        (,, address depositor,,) = _waitingList.deposits(targetIndex);

        vm.prank(depositor);
        _waitingList.withdraw(targetIndex);

        vm.prank(depositor);
        vm.expectRevert(DepositWaitingList.DepositAlreadyApplied.selector);
        _waitingList.withdraw(targetIndex);
    }

    function testFuzz_Apply_PendingDeposit(
        uint256 numDeposits,
        uint256 totalAmount,
        uint256 numWithdrawn,
        uint256 numApplied,
        uint256 targetIndex
    ) public {
        uint256 perAmount = _createDepositsAndApplyWithdraw(
            numDeposits, totalAmount, numApplied, numWithdrawn, targetIndex
        );
        targetIndex = bound(targetIndex, 0, bound(numDeposits, 2, 10) - 1);

        uint256 bridgeBefore = _token.balanceOf(address(_bridge));

        uint256[] memory ids = new uint256[](1);
        ids[0] = targetIndex;

        vm.prank(relayer);
        _waitingList.applyDeposits(address(_token), ids);

        (,,,, bool applied) = _waitingList.deposits(targetIndex);
        assertTrue(applied);
        assertEq(_token.balanceOf(address(_bridge)), bridgeBefore + perAmount);
    }

    function testFuzz_Apply_RevertIfApplied(
        uint256 numDeposits,
        uint256 totalAmount,
        uint256 numWithdrawn,
        uint256 numApplied,
        uint256 targetIndex
    ) public {
        _createDepositsAndApplyWithdraw(numDeposits, totalAmount, numApplied, numWithdrawn, targetIndex);
        targetIndex = bound(targetIndex, 0, bound(numDeposits, 2, 10) - 1);

        uint256[] memory ids = new uint256[](1);
        ids[0] = targetIndex;

        vm.prank(relayer);
        _waitingList.applyDeposits(address(_token), ids);

        vm.prank(relayer);
        vm.expectRevert(DepositWaitingList.DepositAlreadyApplied.selector);
        _waitingList.applyDeposits(address(_token), ids);
    }

    function testFuzz_Apply_RevertIfWithdrawn(
        uint256 numDeposits,
        uint256 totalAmount,
        uint256 numWithdrawn,
        uint256 numApplied,
        uint256 targetIndex
    ) public {
        _createDepositsAndApplyWithdraw(numDeposits, totalAmount, numApplied, numWithdrawn, targetIndex);
        targetIndex = bound(targetIndex, 0, bound(numDeposits, 2, 10) - 1);

        (,, address depositor,,) = _waitingList.deposits(targetIndex);

        vm.prank(depositor);
        _waitingList.withdraw(targetIndex);

        uint256[] memory ids = new uint256[](1);
        ids[0] = targetIndex;

        vm.prank(relayer);
        vm.expectRevert(DepositWaitingList.DepositAlreadyApplied.selector);
        _waitingList.applyDeposits(address(_token), ids);
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
            keccak256(abi.encode(permitTypehash, permitUser, address(_waitingList), DEPOSIT_AMOUNT, 0, deadline));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, digest);

        bytes memory permit = abi.encodePacked(deadline, v, r, s);

        uint256 balanceBefore = permitToken.balanceOf(permitUser);
        vm.prank(permitUser);
        uint256 id = _waitingList.deposit(address(permitToken), DEPOSIT_AMOUNT, permitUser, permit);

        assertEq(permitToken.balanceOf(permitUser), balanceBefore - DEPOSIT_AMOUNT);
        assertEq(permitToken.balanceOf(address(_waitingList)), DEPOSIT_AMOUNT);
        assertEq(id, 0);
    }

    function test_Deposit_WithInvalidPermitLength_Reverts() public {
        MockERC20Permit permitToken = new MockERC20Permit("PermitToken", "PTK", 18);
        permitToken.mint(user, INITIAL_BALANCE);

        // 65 bytes instead of 97 — invalid length
        bytes memory invalidPermit = abi.encodePacked(uint256(1), uint8(27), bytes32(0));

        vm.prank(user);
        vm.expectRevert(DepositWaitingList.InvalidPermitLength.selector);
        _waitingList.deposit(address(permitToken), DEPOSIT_AMOUNT, user, invalidPermit);
    }

    function test_Deposit_WithEmptyPermit_RequiresApproval() public {
        MockERC20Permit permitToken = new MockERC20Permit("PermitToken", "PTK", 18);
        permitToken.mint(user, INITIAL_BALANCE);

        // No approval and empty permit — should revert on transferFrom
        vm.prank(user);
        vm.expectRevert();
        _waitingList.deposit(address(permitToken), DEPOSIT_AMOUNT, user, "");

        // Now approve and deposit with empty permit — should work
        vm.prank(user);
        permitToken.approve(address(_waitingList), DEPOSIT_AMOUNT);

        vm.prank(user);
        _waitingList.deposit(address(permitToken), DEPOSIT_AMOUNT, user, "");

        assertEq(permitToken.balanceOf(address(_waitingList)), DEPOSIT_AMOUNT);
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
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");
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
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");

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
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");

        uint256[] memory ids = new uint256[](1);
        ids[0] = 0;

        vm.prank(relayer);
        vm.expectRevert(Bridge.ContractPaused.selector);
        _waitingList.applyDeposits(address(_token), ids);
    }
}
