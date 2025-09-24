// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {WrappedToken} from "pod-protocol/WrappedToken.sol";

contract DeployToken is Script {
    function run(string memory name, string memory symbol, uint8 decimals, address mintTo, uint256 amount)
        external
        returns (address token)
    {
        vm.startBroadcast();
        WrappedToken t = new WrappedToken(name, symbol, decimals);
        t.mint(mintTo, amount);
        vm.stopBroadcast();
        console.log("Minted amount:", amount);
        console.log("Minted to:", mintTo);
        console.log("Token deployed at:", address(t));
        return address(t);
    }
}
