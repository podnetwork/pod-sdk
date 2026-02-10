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

    // ========== Helpers ==========

    function _applyDeposits(
        address token,
        uint256[] memory ids,
        uint256[] memory amounts,
        address[] memory froms,
        address[] memory tos
    ) internal {
        _waitingList.applyDeposits(token, ids, amounts, froms, tos);
    }

    function _applySingle(uint256 id, address token, uint256 amount, address from, address to) internal {
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        address[] memory froms = new address[](1);
        address[] memory tos = new address[](1);
        ids[0] = id;
        amounts[0] = amount;
        froms[0] = from;
        tos[0] = to;
        _waitingList.applyDeposits(token, ids, amounts, froms, tos);
    }

    // ========== Deposit Tests ==========

    function test_Deposit_Success() public {
        vm.prank(user);
        uint256 id = _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");
        assertEq(id, 0);

        bytes32 expectedHash = keccak256(abi.encode(address(_token), DEPOSIT_AMOUNT, user, user));
        assertEq(_waitingList.depositHashes(0), expectedHash);
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

        bytes32 hash0 = _waitingList.depositHashes(0);
        bytes32 hash1 = _waitingList.depositHashes(1);
        assertEq(hash0, keccak256(abi.encode(address(_token), DEPOSIT_AMOUNT, user, user)));
        assertEq(hash1, keccak256(abi.encode(address(_token), DEPOSIT_AMOUNT * 2, user2, user2)));
    }

    function test_Deposit_DifferentRecipient() public {
        vm.prank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user2, "");

        bytes32 hash = _waitingList.depositHashes(0);
        assertEq(hash, keccak256(abi.encode(address(_token), DEPOSIT_AMOUNT, user, user2)));
    }

    // ========== Apply Tests ==========

    function test_Apply_Single() public {
        vm.prank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");

        vm.prank(relayer);
        _applySingle(0, address(_token), DEPOSIT_AMOUNT, user, user);

        assertEq(_waitingList.depositHashes(0), bytes32(0));

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
        uint256[] memory amounts = new uint256[](3);
        address[] memory froms = new address[](3);
        address[] memory tos = new address[](3);

        ids[0] = 0;
        amounts[0] = DEPOSIT_AMOUNT;
        froms[0] = user;
        tos[0] = user;

        ids[1] = 1;
        amounts[1] = DEPOSIT_AMOUNT * 2;
        froms[1] = user;
        tos[1] = user;

        ids[2] = 2;
        amounts[2] = DEPOSIT_AMOUNT;
        froms[2] = user;
        tos[2] = user2;

        vm.prank(relayer);
        _applyDeposits(address(_token), ids, amounts, froms, tos);

        for (uint256 i = 0; i < 3; i++) {
            assertEq(_waitingList.depositHashes(i), bytes32(0));
        }

        assertEq(_token.balanceOf(address(_waitingList)), 0);
        assertEq(_token.balanceOf(address(_bridge)), DEPOSIT_AMOUNT * 4);
    }

    function test_Apply_EmitsEvents() public {
        vm.prank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");

        vm.prank(relayer);
        vm.expectEmit(true, true, true, true);
        emit DepositWaitingList.WaitingDepositApplied(0);
        _applySingle(0, address(_token), DEPOSIT_AMOUNT, user, user);
    }

    function test_Apply_RevertIfNotRelayer() public {
        vm.prank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");

        vm.prank(user);
        vm.expectRevert();
        _applySingle(0, address(_token), DEPOSIT_AMOUNT, user, user);
    }

    function test_Apply_RevertIfAlreadyApplied() public {
        vm.prank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");

        vm.prank(relayer);
        _applySingle(0, address(_token), DEPOSIT_AMOUNT, user, user);

        vm.prank(relayer);
        vm.expectRevert(DepositWaitingList.DepositAlreadyApplied.selector);
        _applySingle(0, address(_token), DEPOSIT_AMOUNT, user, user);
    }

    function test_Apply_RevertIfNonexistent() public {
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        address[] memory froms = new address[](1);
        address[] memory tos = new address[](1);
        ids[0] = 999;
        amounts[0] = DEPOSIT_AMOUNT;
        froms[0] = user;
        tos[0] = user;

        vm.prank(relayer);
        vm.expectRevert(DepositWaitingList.DepositDoesNotExist.selector);
        _applyDeposits(address(_token), ids, amounts, froms, tos);
    }

    function test_Deposit_RevertIfAmountExceedsDepositLimit() public {
        vm.prank(user);
        vm.expectRevert(DepositWaitingList.AmountExceedsDepositLimit.selector);
        _waitingList.deposit(address(_token), depositLimit + 1, user, "");
    }

    function test_Apply_RevertIfBridgeLimitHit() public {
        // Deposit exactly at the limit, then deposit again — bridge should reject the second apply
        vm.startPrank(user);
        _waitingList.deposit(address(_token), depositLimit, user, "");
        _waitingList.deposit(address(_token), minAmount, user, "");
        vm.stopPrank();

        // Apply the first deposit (uses all capacity)
        vm.prank(relayer);
        _applySingle(0, address(_token), depositLimit, user, user);

        // Apply the second deposit — bridge daily limit is now exhausted
        vm.prank(relayer);
        vm.expectRevert(Bridge.DailyLimitExhausted.selector);
        _applySingle(1, address(_token), minAmount, user, user);

        // Second deposit should NOT be marked as applied since the tx reverted
        assertNotEq(_waitingList.depositHashes(1), bytes32(0));
    }

    function test_Apply_OutOfOrder() public {
        vm.startPrank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");
        vm.stopPrank();

        // Apply in reverse order (ids 2, 0)
        uint256[] memory ids = new uint256[](2);
        uint256[] memory amounts = new uint256[](2);
        address[] memory froms = new address[](2);
        address[] memory tos = new address[](2);

        ids[0] = 2;
        amounts[0] = DEPOSIT_AMOUNT;
        froms[0] = user;
        tos[0] = user;

        ids[1] = 0;
        amounts[1] = DEPOSIT_AMOUNT;
        froms[1] = user;
        tos[1] = user;

        vm.prank(relayer);
        _applyDeposits(address(_token), ids, amounts, froms, tos);

        assertEq(_waitingList.depositHashes(0), bytes32(0));
        assertNotEq(_waitingList.depositHashes(1), bytes32(0));
        assertEq(_waitingList.depositHashes(2), bytes32(0));
    }

    // ========== Invalid Deposit Data Tests ==========

    function test_Apply_RevertIfInvalidDepositData() public {
        vm.prank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");

        // Wrong amount
        vm.prank(relayer);
        vm.expectRevert(DepositWaitingList.InvalidDepositData.selector);
        _applySingle(0, address(_token), DEPOSIT_AMOUNT + 1, user, user);

        // Wrong from
        vm.prank(relayer);
        vm.expectRevert(DepositWaitingList.InvalidDepositData.selector);
        _applySingle(0, address(_token), DEPOSIT_AMOUNT, user2, user);

        // Wrong to
        vm.prank(relayer);
        vm.expectRevert(DepositWaitingList.InvalidDepositData.selector);
        _applySingle(0, address(_token), DEPOSIT_AMOUNT, user, user2);
    }

    function test_Apply_RevertIfArrayLengthMismatch() public {
        vm.prank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");

        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](2);
        address[] memory froms = new address[](1);
        address[] memory tos = new address[](1);
        ids[0] = 0;
        amounts[0] = DEPOSIT_AMOUNT;
        amounts[1] = DEPOSIT_AMOUNT;
        froms[0] = user;
        tos[0] = user;

        vm.prank(relayer);
        vm.expectRevert(DepositWaitingList.ArrayLengthMismatch.selector);
        _applyDeposits(address(_token), ids, amounts, froms, tos);
    }

    // ========== Token Mismatch Tests ==========

    function test_Apply_RevertIfInvalidDepositData_TokenMismatch() public {
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

        // Try to apply deposit 1 (token2) with token1 as the token param — hash won't match
        vm.prank(relayer);
        vm.expectRevert(DepositWaitingList.InvalidDepositData.selector);
        _applySingle(1, address(_token), DEPOSIT_AMOUNT, user, user);
    }

    // ========== Withdraw Tests ==========

    function test_Withdraw_BySender() public {
        vm.prank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user2, "");

        uint256 userBefore = _token.balanceOf(user);

        vm.prank(user);
        _waitingList.withdraw(0, address(_token), DEPOSIT_AMOUNT, user, user2);

        assertEq(_token.balanceOf(user), userBefore + DEPOSIT_AMOUNT);
        assertEq(_token.balanceOf(address(_waitingList)), 0);

        assertEq(_waitingList.depositHashes(0), bytes32(0));
    }

    function test_Withdraw_ByRelayer() public {
        vm.prank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user2, "");

        uint256 userBefore = _token.balanceOf(user);

        vm.prank(relayer);
        _waitingList.withdraw(0, address(_token), DEPOSIT_AMOUNT, user, user2);

        // Tokens go back to the original sender, not the relayer
        assertEq(_token.balanceOf(user), userBefore + DEPOSIT_AMOUNT);
    }

    function test_Withdraw_EmitsEvent() public {
        vm.prank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");

        vm.prank(user);
        vm.expectEmit(true, true, true, true);
        emit DepositWaitingList.WaitingDepositWithdrawn(0);
        _waitingList.withdraw(0, address(_token), DEPOSIT_AMOUNT, user, user);
    }

    function test_Withdraw_RevertIfNotAuthorized() public {
        vm.prank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");

        vm.prank(user2);
        vm.expectRevert(DepositWaitingList.NotAuthorized.selector);
        _waitingList.withdraw(0, address(_token), DEPOSIT_AMOUNT, user, user);
    }

    function test_Withdraw_RevertIfAlreadyApplied() public {
        vm.prank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");

        vm.prank(relayer);
        _applySingle(0, address(_token), DEPOSIT_AMOUNT, user, user);

        vm.prank(user);
        vm.expectRevert(DepositWaitingList.DepositAlreadyApplied.selector);
        _waitingList.withdraw(0, address(_token), DEPOSIT_AMOUNT, user, user);
    }

    function test_Withdraw_RevertIfAlreadyWithdrawn() public {
        vm.prank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");

        vm.prank(user);
        _waitingList.withdraw(0, address(_token), DEPOSIT_AMOUNT, user, user);

        vm.prank(user);
        vm.expectRevert(DepositWaitingList.DepositAlreadyApplied.selector);
        _waitingList.withdraw(0, address(_token), DEPOSIT_AMOUNT, user, user);
    }

    function test_Withdraw_RevertIfNonexistent() public {
        vm.prank(user);
        vm.expectRevert(DepositWaitingList.DepositDoesNotExist.selector);
        _waitingList.withdraw(999, address(_token), DEPOSIT_AMOUNT, user, user);
    }

    function test_Withdraw_RevertIfInvalidDepositData() public {
        vm.prank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");

        // Wrong amount
        vm.prank(user);
        vm.expectRevert(DepositWaitingList.InvalidDepositData.selector);
        _waitingList.withdraw(0, address(_token), DEPOSIT_AMOUNT + 1, user, user);

        // Wrong token
        vm.prank(user);
        vm.expectRevert(DepositWaitingList.InvalidDepositData.selector);
        _waitingList.withdraw(0, address(0xdead), DEPOSIT_AMOUNT, user, user);

        // Wrong to
        vm.prank(user);
        vm.expectRevert(DepositWaitingList.InvalidDepositData.selector);
        _waitingList.withdraw(0, address(_token), DEPOSIT_AMOUNT, user, user2);
    }

    // ========== Fuzz Tests ==========

    struct DepositData {
        address token;
        uint256 amount;
        address from;
        address to;
    }

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

        // Track deposit data for each deposit
        address[] memory depositFroms = new address[](numDeposits);

        for (uint256 i = 0; i < numDeposits; i++) {
            address depositor = i % 2 == 0 ? user : user2;
            depositFroms[i] = depositor;
            vm.prank(depositor);
            _waitingList.deposit(address(_token), perAmount, user, "");
        }

        if (numApplied > 0) {
            uint256[] memory applyIds = new uint256[](numApplied);
            uint256[] memory applyAmounts = new uint256[](numApplied);
            address[] memory applyFroms = new address[](numApplied);
            address[] memory applyTos = new address[](numApplied);
            uint256 idx;
            for (uint256 i = 0; i < numDeposits && idx < numApplied; i++) {
                if (i == targetIndex) continue;
                applyIds[idx] = i;
                applyAmounts[idx] = perAmount;
                applyFroms[idx] = depositFroms[i];
                applyTos[idx] = user;
                idx++;
            }
            vm.prank(relayer);
            _applyDeposits(address(_token), applyIds, applyAmounts, applyFroms, applyTos);
        }

        uint256 withdrawn;
        for (uint256 i = 0; i < numDeposits && withdrawn < numWithdrawn; i++) {
            if (i == targetIndex) continue;
            bytes32 hash = _waitingList.depositHashes(i);
            if (hash == bytes32(0)) continue;
            vm.prank(depositFroms[i]);
            _waitingList.withdraw(i, address(_token), perAmount, depositFroms[i], user);
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

        address depositor = targetIndex % 2 == 0 ? user : user2;
        uint256 senderBefore = _token.balanceOf(depositor);

        vm.prank(depositor);
        _waitingList.withdraw(targetIndex, address(_token), perAmount, depositor, user);

        assertEq(_token.balanceOf(depositor), senderBefore + perAmount);
        assertEq(_waitingList.depositHashes(targetIndex), bytes32(0));
    }

    function testFuzz_Withdraw_RevertIfAlreadyApplied(
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

        address depositor = targetIndex % 2 == 0 ? user : user2;

        vm.prank(relayer);
        _applySingle(targetIndex, address(_token), perAmount, depositor, user);

        vm.prank(depositor);
        vm.expectRevert(DepositWaitingList.DepositAlreadyApplied.selector);
        _waitingList.withdraw(targetIndex, address(_token), perAmount, depositor, user);
    }

    function testFuzz_Withdraw_RevertIfAlreadyWithdrawn(
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

        address depositor = targetIndex % 2 == 0 ? user : user2;

        vm.prank(depositor);
        _waitingList.withdraw(targetIndex, address(_token), perAmount, depositor, user);

        vm.prank(depositor);
        vm.expectRevert(DepositWaitingList.DepositAlreadyApplied.selector);
        _waitingList.withdraw(targetIndex, address(_token), perAmount, depositor, user);
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
        address depositor = targetIndex % 2 == 0 ? user : user2;

        vm.prank(relayer);
        _applySingle(targetIndex, address(_token), perAmount, depositor, user);

        assertEq(_waitingList.depositHashes(targetIndex), bytes32(0));
        assertEq(_token.balanceOf(address(_bridge)), bridgeBefore + perAmount);
    }

    function testFuzz_Apply_RevertIfApplied(
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

        address depositor = targetIndex % 2 == 0 ? user : user2;

        vm.prank(relayer);
        _applySingle(targetIndex, address(_token), perAmount, depositor, user);

        vm.prank(relayer);
        vm.expectRevert(DepositWaitingList.DepositAlreadyApplied.selector);
        _applySingle(targetIndex, address(_token), perAmount, depositor, user);
    }

    function testFuzz_Apply_RevertIfWithdrawn(
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

        address depositor = targetIndex % 2 == 0 ? user : user2;

        vm.prank(depositor);
        _waitingList.withdraw(targetIndex, address(_token), perAmount, depositor, user);

        vm.prank(relayer);
        vm.expectRevert(DepositWaitingList.DepositAlreadyApplied.selector);
        _applySingle(targetIndex, address(_token), perAmount, depositor, user);
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

        vm.prank(admin);
        _bridge.whiteListToken(
            address(permitToken), makeAddr("mirrorPermitToken2"), minAmount, depositLimit, claimLimit
        );

        // 65 bytes instead of 97 — invalid length
        bytes memory invalidPermit = abi.encodePacked(uint256(1), uint8(27), bytes32(0));

        vm.prank(user);
        vm.expectRevert(DepositWaitingList.InvalidPermitLength.selector);
        _waitingList.deposit(address(permitToken), DEPOSIT_AMOUNT, user, invalidPermit);
    }

    function test_Deposit_WithEmptyPermit_RequiresApproval() public {
        MockERC20Permit permitToken = new MockERC20Permit("PermitToken", "PTK", 18);
        permitToken.mint(user, INITIAL_BALANCE);

        vm.prank(admin);
        _bridge.whiteListToken(
            address(permitToken), makeAddr("mirrorPermitToken3"), minAmount, depositLimit, claimLimit
        );

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
        uint256[] memory amounts = new uint256[](2);
        address[] memory froms = new address[](2);
        address[] memory tos = new address[](2);

        ids[0] = 0;
        amounts[0] = DEPOSIT_AMOUNT;
        froms[0] = user;
        tos[0] = user;

        ids[1] = 1;
        amounts[1] = DEPOSIT_AMOUNT;
        froms[1] = user;
        tos[1] = user;

        vm.prank(relayer);
        _applyDeposits(address(_token), ids, amounts, froms, tos);

        assertEq(_bridge.depositIndex(), bridgeIndexBefore + 2);
    }

    function test_Apply_WorksInPublicMode() public {
        vm.prank(admin);
        _bridge.setState(Bridge.ContractState.Public);

        vm.prank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");

        vm.prank(relayer);
        _applySingle(0, address(_token), DEPOSIT_AMOUNT, user, user);

        assertEq(_waitingList.depositHashes(0), bytes32(0));
    }

    function test_Apply_RevertIfBridgePaused() public {
        vm.prank(admin);
        _bridge.setState(Bridge.ContractState.Paused);

        vm.prank(user);
        _waitingList.deposit(address(_token), DEPOSIT_AMOUNT, user, "");

        vm.prank(relayer);
        vm.expectRevert(Bridge.ContractPaused.selector);
        _applySingle(0, address(_token), DEPOSIT_AMOUNT, user, user);
    }
}
