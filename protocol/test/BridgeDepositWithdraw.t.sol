// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {BridgeBehaviorTest} from "./abstract/Bridge.t.sol";
import {BridgeDepositWithdraw} from "../src/BridgeDepositWithdraw.sol";
import {IBridgeDepositWithdraw} from "../src/interfaces/IBridgeDepositWithdraw.sol";
import {IBridge} from "../src/interfaces/IBridge.sol";
import {Bridge} from "../src/abstract/Bridge.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IPodRegistry} from "../src/interfaces/IPodRegistry.sol";
import {PodRegistry} from "../src/PodRegistry.sol";
import {PodECDSA} from "pod-sdk/verifier/PodECDSA.sol";
import {ECDSA} from "pod-sdk/verifier/ECDSA.sol";
import {MerkleTree} from "pod-sdk/verifier/MerkleTree.sol";
import {WrappedToken} from "../src/WrappedToken.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract BridgeDepositWithdrawTest is BridgeBehaviorTest {
    BridgeDepositWithdraw private _bridge;
    WrappedToken private _token;
    IPodRegistry podRegistry;
    uint256[] validatorPrivateKeys;
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
        address[] memory initialValidators = new address[](NUMBER_OF_VALIDATORS);

        validatorPrivateKeys = new uint256[](NUMBER_OF_VALIDATORS);

        for (uint256 i = 0; i < NUMBER_OF_VALIDATORS; i++) {
            validatorPrivateKeys[i] = uint256(i + 1);
            initialValidators[i] = vm.addr(validatorPrivateKeys[i]);
        }

        podRegistry = new PodRegistry(initialValidators);
        _bridge = new BridgeDepositWithdraw(address(podRegistry));
        _token = new WrappedToken("InitialToken", "ITKN", 18);
        _token.mint(user, INITIAL_BALANCE);
        _token.mint(admin, INITIAL_BALANCE);
        _token.approve(address(_bridge), type(uint256).max);
        _bridge.whiteListToken(address(_token), MIRROR_TOKEN, tokenLimits);

        vm.stopPrank();

        vm.prank(user);
        _token.approve(address(_bridge), type(uint256).max);
    }

    function test_Deposit_TransfersIntoBridge() public {
        uint256 ub = _token.balanceOf(user);
        uint256 bb = _token.balanceOf(address(_bridge));
        vm.prank(user);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, recipient);
        assertEq(_token.balanceOf(user), ub - DEPOSIT_AMOUNT);
        assertEq(_token.balanceOf(address(_bridge)), bb + DEPOSIT_AMOUNT);
    }

    function test_Claim() public {
        vm.prank(admin);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, recipient);

        vm.prank(user);
        PodECDSA.CertifiedLog memory certifiedLog = createCertifiedLog(3);
        assertEq(_token.balanceOf(recipient), 0);
        assertEq(_token.balanceOf(address(_bridge)), DEPOSIT_AMOUNT);
        vm.expectEmit(true, true, true, true);
        emit IBridge.Claim(0, address(_token), MIRROR_TOKEN, DEPOSIT_AMOUNT, recipient);
        _bridge.claim(certifiedLog);
        assertEq(_token.balanceOf(recipient), DEPOSIT_AMOUNT);
        assertEq(_token.balanceOf(address(_bridge)), 0);

        (, IBridge.TokenUsage memory depositUsage, IBridge.TokenUsage memory claimUsage) =
            bridge().tokenData(address(_token));
        assertEq(depositUsage.consumed, DEPOSIT_AMOUNT);
        assertEq(claimUsage.consumed, DEPOSIT_AMOUNT);
    }

    function test_Claim_RevertIfInvalidCertificate() public {
        // not enough signatures
        PodECDSA.CertifiedLog memory certifiedLog = createCertifiedLog(2);
        vm.expectRevert(abi.encodeWithSelector(IBridgeDepositWithdraw.InvalidCertificate.selector));
        _bridge.claim(certifiedLog);

        // invalid leaf
        certifiedLog = createCertifiedLog(3);
        certifiedLog.certificate.leaf = bytes32(0);
        vm.expectRevert(abi.encodeWithSelector(IBridgeDepositWithdraw.InvalidCertificate.selector));
        _bridge.claim(certifiedLog);

        // tampered proof
        certifiedLog = createCertifiedLog(3);
        certifiedLog.certificate.proof.path[0] = bytes32(uint256(1232));
        vm.expectRevert(abi.encodeWithSelector(IBridgeDepositWithdraw.InvalidCertificate.selector));
        _bridge.claim(certifiedLog);
    }

    function test_Claim_RevertIfAlreadyClaimed() public {
        vm.prank(admin);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, recipient);
        PodECDSA.CertifiedLog memory certifiedLog = createCertifiedLog(3);
        _bridge.claim(certifiedLog);
        vm.expectRevert(abi.encodeWithSelector(IBridge.RequestAlreadyProcessed.selector));
        _bridge.claim(certifiedLog);
    }

    function test_Claim_RevertIfInvalidDepositLog() public {
        PodECDSA.CertifiedLog memory certifiedLog = createCertifiedLog(3);
        certifiedLog.log.topics[0] = bytes32(uint256(1232));
        vm.expectRevert(abi.encodeWithSelector(IBridgeDepositWithdraw.InvalidDepositLog.selector));
        _bridge.claim(certifiedLog);

        certifiedLog = createCertifiedLog(3);
        certifiedLog.log.topics = new bytes32[](1);
        certifiedLog.log.topics[0] = bytes32(uint256(1232));
        vm.expectRevert(abi.encodeWithSelector(IBridgeDepositWithdraw.InvalidDepositLog.selector));
        _bridge.claim(certifiedLog);
    }

    function test_Claim_RevertIfMirrorTokenNotFound() public {
        PodECDSA.CertifiedLog memory certifiedLog = createCertifiedLog(3);
        certifiedLog.log.topics[2] = bytes32(uint256(0xBEEF));
        vm.expectRevert(abi.encodeWithSelector(IBridge.MirrorTokenNotFound.selector));
        _bridge.claim(certifiedLog);
    }

    function test_Claim_RevertIfPaused() public {
        vm.prank(admin);
        _bridge.pause();
        PodECDSA.CertifiedLog memory certifiedLog = createCertifiedLog(3);
        vm.expectRevert(abi.encodeWithSelector(Pausable.EnforcedPause.selector));
        _bridge.claim(certifiedLog);
    }

    function test_Migrate_TransfersAllTokenBalances() public {
        vm.prank(user);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, recipient);
        vm.prank(admin);
        _bridge.pause();
        uint256 beforeAmt = _token.balanceOf(address(_bridge));
        vm.prank(admin);
        _bridge.migrate(newBridge);
        assertEq(_token.balanceOf(newBridge), beforeAmt);
        assertEq(_token.balanceOf(address(_bridge)), 0);
    }

    function test_Whitelist_RevertIfSameTokenTwiceDifferentMirror() public {
        WrappedToken anotherMirror = new WrappedToken("Token", "TKN", 18);
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(IBridge.InvalidTokenConfig.selector));
        _bridge.whiteListToken(address(_token), address(anotherMirror), tokenLimits);
    }

    function test_Deposit_RevertWithoutAllowance() public {
        address u = makeAddr("noapprove");
        vm.prank(admin);
        _token.mint(u, DEPOSIT_AMOUNT);
        vm.prank(u);
        vm.expectRevert();
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, recipient);
    }

    function test_Migrate_NoWhitelistedTokens() public {
        vm.prank(admin);
        BridgeDepositWithdraw fresh = new BridgeDepositWithdraw(address(podRegistry));
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
        _bridge.whiteListToken(address(t2), address(m2), tokenLimits);
        vm.prank(user);
        _token.approve(address(_bridge), type(uint256).max);
        vm.prank(user);
        _bridge.deposit(address(_token), DEPOSIT_AMOUNT, address(1));
        vm.prank(admin);
        _bridge.pause();
        vm.prank(admin);
        _bridge.migrate(newBridge);
        assertEq(_token.balanceOf(newBridge), DEPOSIT_AMOUNT);
        assertEq(t2.balanceOf(newBridge), 0);
    }

    function test_WhitelistedTokens_ListGrowsAndOrder() public {
        WrappedToken t2 = new WrappedToken("Token", "TKN", 18);
        WrappedToken m2 = new WrappedToken("Mirror", "MRR", 18);
        vm.prank(admin);
        _bridge.whiteListToken(address(t2), address(m2), tokenLimits);
        assertEq(_bridge.whitelistedTokens(0), address(_token));
        assertEq(_bridge.whitelistedTokens(1), address(t2));
    }

    function test_MultiToken_DepositTracksUsageSeparately() public {
        address t2 = address(0xB0B2);
        WrappedToken t2Mock = new WrappedToken("Token", "TKN", 18);
        vm.prank(admin);
        _bridge.whiteListToken(
            t2,
            address(t2Mock),
            IBridge.TokenLimits({
                minAmount: tokenLimits.minAmount,
                deposit: tokenLimits.deposit,
                claim: tokenLimits.claim
            })
        );

        vm.prank(user);
        bridge().deposit(address(token()), tokenLimits.minAmount, recipient);
        (, IBridge.TokenUsage memory dep1,) = bridge().tokenData(address(token()));
        assertEq(dep1.consumed, tokenLimits.minAmount);

        (, IBridge.TokenUsage memory dep2,) = bridge().tokenData(t2);
        assertEq(dep2.consumed, 0);
    }

    function createCertifiedLog(uint256 numberOfRequiredSignatures)
        internal
        view
        returns (PodECDSA.CertifiedLog memory)
    {
        bytes32 receiptRoot = 0xca35a1783abe48ca23da757fb7253a1315777b4e8820262c67e85e6f87eb340f;
        bytes32[] memory topics = new bytes32[](3);
        topics[0] = keccak256("Deposit(uint256,address,uint256,address)");
        topics[1] = bytes32(uint256(0));
        topics[2] = bytes32(uint256(uint160(MIRROR_TOKEN)));

        bytes memory data = abi.encode(DEPOSIT_AMOUNT, recipient);

        bytes32[] memory merklePath = new bytes32[](4);

        merklePath[0] = 0x8a998be39bd3962defce6fb56ba8a10da89ae208743fa4147503adebfb32005d;
        merklePath[1] = 0x2498e05df11f1325b6f78c1d181cb7db187233732812af1f16efe9a129abe618;
        merklePath[2] = 0xaae4eb6d4b3989ffc690c918484b530f4d853427b635b39e8f70975dd7cbff1b;
        merklePath[3] = 0x996db2475c7d59b0652b50c24aeca2454967b3e7101a667e2ce9d03567202483;

        bytes[] memory signatures = new bytes[](numberOfRequiredSignatures);
        uint256[] memory sortedAttestationTimestamps = new uint256[](numberOfRequiredSignatures);
        for (uint256 i = 0; i < numberOfRequiredSignatures; i++) {
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(validatorPrivateKeys[i], receiptRoot);
            signatures[i] = ECDSA._serialize_signature(v, r, s);
            sortedAttestationTimestamps[i] = i + 1;
        }

        bytes memory aggregateSignature = ECDSA.aggregate_signatures(signatures);

        PodECDSA.CertifiedReceipt memory certifiedReceipt = PodECDSA.CertifiedReceipt({
            receiptRoot: receiptRoot,
            aggregateSignature: aggregateSignature,
            sortedAttestationTimestamps: sortedAttestationTimestamps
        });

        PodECDSA.Log memory log = PodECDSA.Log({addr: address(_bridge), topics: topics, data: data});

        bytes32 logHash = PodECDSA.hashLog(log);
        bytes32 leaf = MerkleTree.hashLeaf(bytes("log_hashes[1]"), logHash);
        MerkleTree.Proof memory proof = MerkleTree.Proof({path: merklePath});

        PodECDSA.CertifiedLog memory certifiedLog = PodECDSA.CertifiedLog({
            log: log,
            logIndex: 1,
            certificate: PodECDSA.Certificate({leaf: leaf, certifiedReceipt: certifiedReceipt, proof: proof})
        });

        return certifiedLog;
    }
}
