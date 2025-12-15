// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {console} from "forge-std/Test.sol";
import {BridgeClaimProofHelper} from "./abstract/BridgeClaimProofHelper.sol";
import {BridgeDepositWithdraw} from "../src/BridgeDepositWithdraw.sol";
import {IBridge} from "../src/interfaces/IBridge.sol";
import {PodRegistry} from "../src/PodRegistry.sol";
import {MerkleTree} from "pod-sdk/verifier/MerkleTree.sol";
import {WrappedToken} from "../src/WrappedToken.sol";

contract BridgeDepositWithdrawBenchmark is BridgeClaimProofHelper {
    BridgeDepositWithdraw private bridge;
    PodRegistry private podRegistry;
    WrappedToken private token;

    address private admin = makeAddr("admin");
    address private user = makeAddr("user");
    address private mirrorToken = makeAddr("mirrorToken");

    uint256 private constant DEPOSIT_AMOUNT = 100e18;
    IBridge.TokenLimits private nativeTokenLimits =
        IBridge.TokenLimits({minAmount: 0.01 ether, deposit: 500e18, claim: 400e18});
    IBridge.TokenLimits private tokenLimits = IBridge.TokenLimits({minAmount: 1e18, deposit: 500e18, claim: 400e18});

    function _setupWithValidators(uint256 numValidators) internal {
        vm.startPrank(admin);

        address[] memory initialValidators = new address[](numValidators);
        validatorPrivateKeys = new uint256[](numValidators);
        otherBridgeContract = makeAddr("otherBridgeContract");

        for (uint256 i = 0; i < numValidators; i++) {
            validatorPrivateKeys[i] = uint256(i + 1);
            initialValidators[i] = vm.addr(validatorPrivateKeys[i]);
        }

        podRegistry = new PodRegistry(initialValidators);
        bridge = new BridgeDepositWithdraw(address(podRegistry), otherBridgeContract, nativeTokenLimits);

        // Setup token for claim() benchmarks
        token = new WrappedToken("TestToken", "TKN", 18);
        bridge.whiteListToken(address(token), mirrorToken, tokenLimits);
        token.mint(address(bridge), 1000e18);

        vm.stopPrank();

        // Fund the bridge with native tokens for claimNative
        vm.deal(address(bridge), 1000 ether);
    }

    // ========== claimNative Benchmarks ==========

    function _benchmarkClaimNative(uint256 numValidators) internal {
        _setupWithValidators(numValidators);
        (, uint64 committeeEpoch, bytes memory aggregatedSignatures, MerkleTree.MultiProof memory proof) =
            createNativeClaimProof(DEPOSIT_AMOUNT, user, numValidators);

        uint256 gasBefore = gasleft();
        bridge.claimNative(DEPOSIT_AMOUNT, user, committeeEpoch, aggregatedSignatures, proof);
        uint256 gasUsed = gasBefore - gasleft();

        console.log("claimNative gas with %d validators: %d", numValidators, gasUsed);
    }

    function test_benchmark_claimNative_4validators() public {
        _benchmarkClaimNative(4);
    }

    function test_benchmark_claimNative_10validators() public {
        _benchmarkClaimNative(10);
    }

    function test_benchmark_claimNative_20validators() public {
        _benchmarkClaimNative(20);
    }

    function test_benchmark_claimNative_50validators() public {
        _benchmarkClaimNative(50);
    }

    function test_benchmark_claimNative_100validators() public {
        _benchmarkClaimNative(100);
    }

    // ========== claim Benchmarks ==========

    function _benchmarkClaim(uint256 numValidators) internal {
        _setupWithValidators(numValidators);
        (, uint64 committeeEpoch, bytes memory aggregatedSignatures, MerkleTree.MultiProof memory proof) =
            createTokenClaimProof(mirrorToken, DEPOSIT_AMOUNT, user, numValidators);

        uint256 gasBefore = gasleft();
        bridge.claim(mirrorToken, DEPOSIT_AMOUNT, user, committeeEpoch, aggregatedSignatures, proof);
        uint256 gasUsed = gasBefore - gasleft();

        console.log("claim gas with %d validators: %d", numValidators, gasUsed);
    }

    function test_benchmark_claim_4validators() public {
        _benchmarkClaim(4);
    }

    function test_benchmark_claim_10validators() public {
        _benchmarkClaim(10);
    }

    function test_benchmark_claim_20validators() public {
        _benchmarkClaim(20);
    }

    function test_benchmark_claim_50validators() public {
        _benchmarkClaim(50);
    }

    function test_benchmark_claim_100validators() public {
        _benchmarkClaim(100);
    }
}
