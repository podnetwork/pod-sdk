// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {Bridge} from "pod-protocol/Bridge.sol";
import {ProxyAdmin} from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import {ERC1967Utils} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol";

contract AdminHandover is Script {
    // Arbitrum One
    Bridge constant BRIDGE = Bridge(0xB77E6fB078918f255FC71E8b11A798124b7f0Fa0);
    address constant TIMELOCK = 0x43404243EA56035E951e29AF99bb76834f36AC6E;

    function run() public {
        run(BRIDGE, TIMELOCK);
    }

    // Sent by the current admin. Irreversible.
    // Check manually: roles from 06 are in place and the timelock config is correct.
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
