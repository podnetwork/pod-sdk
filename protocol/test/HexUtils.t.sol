// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {HexUtils} from "../src/libraries/HexUtils.sol";

contract HexUtilsTest is Test {
    function test_uintFromBigEndian() public pure {
        assertEq(HexUtils.uintFromBigEndian(hex"0156"), 342);
    }

    function test_toBytesMinimal() public pure {
        assertEq(HexUtils.toBytesMinimal(342), hex"0156");
    }
}
