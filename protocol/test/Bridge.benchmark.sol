// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {console} from "forge-std/Test.sol";
import {BridgeClaimProofHelper} from "./abstract/BridgeClaimProofHelper.sol";
import {Bridge} from "../src/Bridge.sol";
import {WrappedToken} from "../src/WrappedToken.sol";

contract BridgeBenchmark is BridgeClaimProofHelper {
    Bridge private bridge;
    WrappedToken private token;

    address private admin = makeAddr("admin");
    address private user = makeAddr("user");
    address private mirrorToken = makeAddr("mirrorToken");

    uint256 private constant DEPOSIT_AMOUNT = 100e18;
    uint256 private constant SRC_CHAIN_ID = 0x50d;
    uint256 minAmount = 1e18;
    uint256 depositLimit = 500e18;
    uint256 claimLimit = 400e18;

    function _setupWithValidators(uint256 numValidators) internal {
        vm.startPrank(admin);

        address[] memory initialValidators = new address[](numValidators);
        validatorPrivateKeys = new uint256[](numValidators);
        otherBridgeContract = makeAddr("otherBridgeContract");

        for (uint256 i = 0; i < numValidators; i++) {
            validatorPrivateKeys[i] = uint256(i + 1);
            initialValidators[i] = vm.addr(validatorPrivateKeys[i]);
        }

        uint64 f = uint64((numValidators - 1) / 3);
        if (f == 0) f = 1; // minimum resilience is 1
        bridge = new Bridge(otherBridgeContract, initialValidators, f, SRC_CHAIN_ID, 1);

        // Setup token for claim() benchmarks
        token = new WrappedToken("TestToken", "TKN", 18);
        bridge.whiteListToken(address(token), mirrorToken, minAmount, depositLimit, claimLimit);
        token.mint(address(bridge), 1000e18);

        vm.stopPrank();
    }

    // ========== claim Benchmarks ==========

    function _benchmarkClaim(uint256 numValidators) internal {
        _setupWithValidators(numValidators);
        bytes32 domainSeparator = bridge.domainSeperator();
        (, bytes memory aggregatedSignatures, bytes memory proof) =
            createTokenClaimProof(mirrorToken, DEPOSIT_AMOUNT, user, numValidators, domainSeparator);

        uint256 gasBefore = gasleft();
        bridge.claim(address(token), DEPOSIT_AMOUNT, user, aggregatedSignatures, proof);
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
