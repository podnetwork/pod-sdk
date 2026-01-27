// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {BridgeClaimProofHelper} from "./abstract/BridgeClaimProofHelper.sol";
import {Bridge} from "../src/Bridge.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";

contract BridgeForkTest is BridgeClaimProofHelper {
    // Ethereum mainnet USDC
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;

    Bridge bridge;

    address admin = makeAddr("admin");
    address user = makeAddr("user");
    address mirrorUsdc = makeAddr("mirrorUsdc");

    uint256 constant NUM_VALIDATORS = 4;
    uint256 constant CHAIN_ID = 1;

    uint256 constant DEPOSIT_AMOUNT = 1000e6; // 1000 USDC (6 decimals)
    uint256 constant MIN_AMOUNT = 10e6;
    uint256 constant DEPOSIT_LIMIT = 100_000e6;
    uint256 constant CLAIM_LIMIT = 100_000e6;

    function setUp() public {
        vm.createSelectFork(vm.envString("ETH_RPC_URL"));

        // Setup validators (using inherited fields from BridgeClaimProofHelper)
        address[] memory validators = new address[](NUM_VALIDATORS);
        validatorPrivateKeys = new uint256[](NUM_VALIDATORS);
        otherBridgeContract = makeAddr("podBridge");

        for (uint256 i = 0; i < NUM_VALIDATORS; i++) {
            validatorPrivateKeys[i] = i + 1;
            validators[i] = vm.addr(validatorPrivateKeys[i]);
        }

        // Deploy bridge
        vm.startPrank(admin);
        uint8 f = uint8((NUM_VALIDATORS - 1) / 3);
        bridge = new Bridge(otherBridgeContract, validators, f, CHAIN_ID, 1, bytes32(0));
        bridge.whiteListToken(USDC, mirrorUsdc, MIN_AMOUNT, DEPOSIT_LIMIT, CLAIM_LIMIT);
        vm.stopPrank();

        // Fund user and bridge with USDC
        deal(USDC, user, DEPOSIT_AMOUNT * 10);
        deal(USDC, address(bridge), DEPOSIT_AMOUNT * 10);
    }

    function test_Fork_DepositUSDC() public {
        uint256 userBalanceBefore = IERC20(USDC).balanceOf(user);
        uint256 bridgeBalanceBefore = IERC20(USDC).balanceOf(address(bridge));

        vm.startPrank(user);
        IERC20(USDC).approve(address(bridge), DEPOSIT_AMOUNT);

        vm.expectEmit(true, true, true, true);
        emit Bridge.Deposit(0, user, user, USDC, DEPOSIT_AMOUNT);
        bridge.deposit(USDC, DEPOSIT_AMOUNT, user, "");
        vm.stopPrank();

        assertEq(IERC20(USDC).balanceOf(user), userBalanceBefore - DEPOSIT_AMOUNT);
        assertEq(IERC20(USDC).balanceOf(address(bridge)), bridgeBalanceBefore + DEPOSIT_AMOUNT);
    }

    function test_Fork_DepositUSDC_ToDifferentRecipient() public {
        address recipient = makeAddr("recipient");

        vm.startPrank(user);
        IERC20(USDC).approve(address(bridge), DEPOSIT_AMOUNT);

        vm.expectEmit(true, true, true, true);
        emit Bridge.Deposit(0, user, recipient, USDC, DEPOSIT_AMOUNT);
        bridge.deposit(USDC, DEPOSIT_AMOUNT, recipient, "");
        vm.stopPrank();
    }

    function test_Fork_ClaimUSDC() public {
        uint256 userBalanceBefore = IERC20(USDC).balanceOf(user);
        uint256 bridgeBalanceBefore = IERC20(USDC).balanceOf(address(bridge));

        (bytes32 txHash, bytes memory proof,) =
            createTokenClaimProof(mirrorUsdc, DEPOSIT_AMOUNT, user, NUM_VALIDATORS, bridge.domainSeparator());

        vm.expectEmit(true, true, true, true);
        emit Bridge.Claim(txHash, USDC, mirrorUsdc, DEPOSIT_AMOUNT, user);
        bridge.claim(USDC, DEPOSIT_AMOUNT, user, proof, "");

        assertEq(IERC20(USDC).balanceOf(user), userBalanceBefore + DEPOSIT_AMOUNT);
        assertEq(IERC20(USDC).balanceOf(address(bridge)), bridgeBalanceBefore - DEPOSIT_AMOUNT);
    }

    function test_Fork_FullBridgingFlow() public {
        address recipient = makeAddr("recipient");

        // Step 1: User deposits USDC
        vm.startPrank(user);
        IERC20(USDC).approve(address(bridge), DEPOSIT_AMOUNT);
        uint256 depositId = bridge.deposit(USDC, DEPOSIT_AMOUNT, recipient, "");
        vm.stopPrank();

        assertEq(depositId, 0);

        // Step 2: Recipient claims USDC (simulating cross-chain message)
        (, bytes memory proof,) =
            createTokenClaimProof(mirrorUsdc, DEPOSIT_AMOUNT, recipient, NUM_VALIDATORS, bridge.domainSeparator());

        uint256 recipientBalanceBefore = IERC20(USDC).balanceOf(recipient);
        bridge.claim(USDC, DEPOSIT_AMOUNT, recipient, proof, "");

        assertEq(IERC20(USDC).balanceOf(recipient), recipientBalanceBefore + DEPOSIT_AMOUNT);
    }

    function test_Fork_MultipleDeposits() public {
        vm.startPrank(user);
        IERC20(USDC).approve(address(bridge), DEPOSIT_AMOUNT * 3);

        uint256 id1 = bridge.deposit(USDC, DEPOSIT_AMOUNT, user, "");
        uint256 id2 = bridge.deposit(USDC, DEPOSIT_AMOUNT, user, "");
        uint256 id3 = bridge.deposit(USDC, DEPOSIT_AMOUNT, user, "");
        vm.stopPrank();

        assertEq(id1, 0);
        assertEq(id2, 1);
        assertEq(id3, 2);
        assertEq(bridge.depositIndex(), 3);
    }

    function test_Fork_ClaimRevertIfAlreadyClaimed() public {
        (, bytes memory proof,) =
            createTokenClaimProof(mirrorUsdc, DEPOSIT_AMOUNT, user, NUM_VALIDATORS, bridge.domainSeparator());

        bridge.claim(USDC, DEPOSIT_AMOUNT, user, proof, "");

        vm.expectRevert(Bridge.RequestAlreadyProcessed.selector);
        bridge.claim(USDC, DEPOSIT_AMOUNT, user, proof, "");
    }

    function test_Fork_DepositRevertIfBelowMinimum() public {
        vm.startPrank(user);
        IERC20(USDC).approve(address(bridge), MIN_AMOUNT - 1);

        vm.expectRevert(Bridge.InvalidTokenAmount.selector);
        bridge.deposit(USDC, MIN_AMOUNT - 1, user, "");
        vm.stopPrank();
    }

    function test_Fork_BatchDepositAndCall_ViaRelayer() public {
        address relayer = makeAddr("relayer");
        address callContract = makeAddr("callContract");

        // Setup relayer role and whitelist call contract
        vm.startPrank(admin);
        bridge.grantRole(bridge.RELAYER_ROLE(), relayer);
        bridge.setCallContractWhitelist(callContract, true);
        vm.stopPrank();

        // Fund user with USDC and approve bridge
        deal(USDC, user, DEPOSIT_AMOUNT);
        vm.prank(user);
        IERC20(USDC).approve(address(bridge), DEPOSIT_AMOUNT);

        uint256 userBalanceBefore = IERC20(USDC).balanceOf(user);
        uint256 bridgeBalanceBefore = IERC20(USDC).balanceOf(address(bridge));

        // Prepare deposit params (no permit - user has pre-approved)
        Bridge.DepositParams[] memory deposits = new Bridge.DepositParams[](1);
        deposits[0] = Bridge.DepositParams({from: user, to: user, amount: DEPOSIT_AMOUNT});

        Bridge.PermitParams[] memory permits = new Bridge.PermitParams[](0);

        // Relayer submits deposit on behalf of user
        vm.prank(relayer);
        vm.expectEmit(true, true, true, true);
        emit Bridge.DepositAndCall(0, USDC, DEPOSIT_AMOUNT, user, callContract, MIN_AMOUNT);
        bridge.batchDepositAndCall(USDC, deposits, permits, callContract, MIN_AMOUNT);

        assertEq(IERC20(USDC).balanceOf(user), userBalanceBefore - DEPOSIT_AMOUNT);
        assertEq(IERC20(USDC).balanceOf(address(bridge)), bridgeBalanceBefore + DEPOSIT_AMOUNT);
    }

    function test_Fork_BatchDepositAndCall_WithUSDCPermit() public {
        // Use a specific private key for the user
        uint256 userPrivateKey = 0xA11CE;
        address userWithKey = vm.addr(userPrivateKey);
        address relayer = makeAddr("relayer");
        address callContract = makeAddr("callContract");

        // Setup relayer role and whitelist call contract
        vm.startPrank(admin);
        bridge.grantRole(bridge.RELAYER_ROLE(), relayer);
        bridge.setCallContractWhitelist(callContract, true);
        vm.stopPrank();

        // Fund user with USDC
        deal(USDC, userWithKey, DEPOSIT_AMOUNT);

        uint256 userBalanceBefore = IERC20(USDC).balanceOf(userWithKey);
        uint256 bridgeBalanceBefore = IERC20(USDC).balanceOf(address(bridge));

        // Build EIP-2612 permit signature for USDC
        uint256 nonce = IERC20Permit(USDC).nonces(userWithKey);
        uint256 deadline = block.timestamp + 1 hours;

        bytes32 PERMIT_TYPEHASH = 0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;
        bytes32 domainSeparator = IERC20Permit(USDC).DOMAIN_SEPARATOR();

        bytes32 structHash = keccak256(
            abi.encode(PERMIT_TYPEHASH, userWithKey, address(bridge), DEPOSIT_AMOUNT, nonce, deadline)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, digest);

        // Prepare deposit and permit params
        Bridge.DepositParams[] memory deposits = new Bridge.DepositParams[](1);
        deposits[0] = Bridge.DepositParams({from: userWithKey, to: userWithKey, amount: DEPOSIT_AMOUNT});

        Bridge.PermitParams[] memory permits = new Bridge.PermitParams[](1);
        permits[0] = Bridge.PermitParams({deadline: deadline, v: v, r: r, s: s});

        // Relayer submits deposit with permit on behalf of user
        vm.prank(relayer);
        bridge.batchDepositAndCall(USDC, deposits, permits, callContract, MIN_AMOUNT);

        assertEq(IERC20(USDC).balanceOf(userWithKey), userBalanceBefore - DEPOSIT_AMOUNT);
        assertEq(IERC20(USDC).balanceOf(address(bridge)), bridgeBalanceBefore + DEPOSIT_AMOUNT);
    }
}
