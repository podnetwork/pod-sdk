// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Test} from "forge-std/Test.sol";
import {Time, POD_TIMESTAMP_PRECOMPILE} from "../Time.sol";
import {REQUIRE_QUORUM} from "../Quorum.sol";
import {EthGetLogsPrecompileHelperTypes} from "../types/EthGetLogsPrecompileHelperTypes.sol";

abstract contract PodTest is Test {
    function podMockQuorum() public {
        // condition must evaluate to true and if so we mock quorum to be true
        vm.mockCall(REQUIRE_QUORUM, abi.encode(true), bytes(""));

        // condition must evaluate to false and if so we revert
        vm.mockCallRevert(REQUIRE_QUORUM, abi.encode(false), bytes(""));
    }

    function podWarp(Time.Timestamp ts) public {
        vm.mockCall(POD_TIMESTAMP_PRECOMPILE, bytes(""), abi.encode(Time.Timestamp.unwrap(ts)));
    }

    function podMockEthGetLogs(bytes memory input, bytes memory output) internal {
        vm.mockCall(EthGetLogsPrecompileHelperTypes.PRECOMPILE_ADDRESS, input, output);
    }

    function podMockEthGetLogsRevert(bytes memory input) internal {
        vm.mockCallRevert(EthGetLogsPrecompileHelperTypes.PRECOMPILE_ADDRESS, input, bytes(""));
    }
}
