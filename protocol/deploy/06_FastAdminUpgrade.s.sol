// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {Bridge} from "pod-protocol/Bridge.sol";
import {ProxyAdmin} from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import {ITransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {ERC1967Utils} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol";

contract FastAdminUpgrade is Script {
    // Sent by the current admin. Reversible: it keeps all its roles.
    // Check manually: fastAdmin is not the timelock proposer.
    function run(Bridge bridge, address timelock, address newImplementation, address fastAdmin, address[] memory pausers)
        public
    {
        ProxyAdmin proxyAdmin = ProxyAdmin(address(uint160(uint256(vm.load(address(bridge), ERC1967Utils.ADMIN_SLOT)))));
        bytes32 defaultAdminRole = bridge.DEFAULT_ADMIN_ROLE();
        bytes32 pauserRole = bridge.PAUSER_ROLE();
        bytes32 fastAdminRole = Bridge(newImplementation).FAST_ADMIN_ROLE();

        vm.startBroadcast(proxyAdmin.owner());

        // Grant roles before the upgrade so there is no gap
        bridge.grantRole(fastAdminRole, fastAdmin);
        for (uint256 i = 0; i < pausers.length; i++) {
            bridge.grantRole(pauserRole, pausers[i]);
        }
        bridge.grantRole(defaultAdminRole, timelock);

        proxyAdmin.upgradeAndCall(ITransparentUpgradeableProxy(address(bridge)), newImplementation, "");

        vm.stopBroadcast();
    }
}
