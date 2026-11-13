// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {Bridge} from "pod-protocol/Bridge.sol";
import {ProxyAdmin} from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import {ERC1967Utils} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol";

contract AdminHandover is Script {
    // Sent by the current admin. Irreversible.
    // Check manually: roles from 05 are in place and the timelock config is correct.
    function run(Bridge bridge, address timelock) public {
        ProxyAdmin proxyAdmin = ProxyAdmin(address(uint160(uint256(vm.load(address(bridge), ERC1967Utils.ADMIN_SLOT)))));
        address admin = proxyAdmin.owner();
        bytes32 defaultAdminRole = bridge.DEFAULT_ADMIN_ROLE();
        bytes32 pauserRole = bridge.PAUSER_ROLE();

        // Renouncing with no other admin would lock the bridge for good
        require(admin != timelock, "already handed over");
        require(bridge.hasRole(defaultAdminRole, timelock), "timelock lacks DEFAULT_ADMIN_ROLE: run step 2 first");

        vm.startBroadcast(admin);

        proxyAdmin.transferOwnership(timelock);
        bridge.renounceRole(pauserRole, admin);
        bridge.renounceRole(defaultAdminRole, admin);

        vm.stopBroadcast();
    }
}
