// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Test} from "forge-std/Test.sol";
import {Time, POD_TIMESTAMP_PRECOMPILE} from "../Time.sol";
import {REQUIRE_QUORUM} from "../Quorum.sol";
import {EthGetLogsTypes} from "../types/EthGetLogsTypes.sol";
import {EthGetBlockByNumberTypes} from "../types/EthGetBlockByNumberTypes.sol";
import {POD_TX_INFO} from "../Context.sol";

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
        vm.mockCall(EthGetLogsTypes.PRECOMPILE_ADDRESS, input, output);
    }

    function podMockEthGetLogsRevert(bytes memory input) internal {
        vm.mockCallRevert(EthGetLogsTypes.PRECOMPILE_ADDRESS, input, bytes(""));
    }

    function podMockEthGetBlockByNumber(bytes memory input, bytes memory output) internal {
        vm.mockCall(EthGetBlockByNumberTypes.PRECOMPILE_ADDRESS, input, output);
    }

    function podMockEthGetBlockByNumberRevert(bytes memory input) internal {
        vm.mockCallRevert(EthGetBlockByNumberTypes.PRECOMPILE_ADDRESS, input, bytes(""));
    }

    function podMockTxInfo(bytes memory output) internal {
        vm.mockCall(POD_TX_INFO, bytes(""), output);
    }

    function podMockMintBalance(address recipient, bytes memory input) internal {
        vm.mockCall(address(uint160(uint256(keccak256("POD_MINT_BALANCE")))), input, bytes(""));
        uint256 amount = abi.decode(input, (uint256));
        vm.deal(recipient, amount);
    }
}
