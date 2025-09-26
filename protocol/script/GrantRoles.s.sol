// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {WrappedToken} from "pod-protocol/WrappedToken.sol";

contract GrantRoles is Script {
    function run(address token, address admin) external {
        vm.startBroadcast();
        WrappedToken t = WrappedToken(token);
        t.grantRole(t.MINTER_ROLE(), admin);
        t.grantRole(t.PAUSER_ROLE(), admin);
        t.grantRole(t.DEFAULT_ADMIN_ROLE(), admin);
        vm.stopBroadcast();
        console.log("Granted roles to:", admin);
    }
}
