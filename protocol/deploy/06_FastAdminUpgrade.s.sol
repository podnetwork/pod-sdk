// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {console, Script} from "forge-std/Script.sol";
import {Bridge} from "pod-protocol/Bridge.sol";
import {ProxyAdmin} from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import {ITransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {ERC1967Utils} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol";

contract FastAdminUpgrade is Script {
    // Arbitrum One
    Bridge constant BRIDGE = Bridge(0xB77E6fB078918f255FC71E8b11A798124b7f0Fa0);
    address constant TIMELOCK = 0x43404243EA56035E951e29AF99bb76834f36AC6E;
    address constant NEW_IMPLEMENTATION = 0x468F3414C29b03D304496b3bB99eE66983DCAC5F;
    address constant FAST_ADMIN = 0x9449BC3ec69aF4AfA2C59B9f48c646e39E57CB8b;

    function run() public {
        run(BRIDGE, TIMELOCK, NEW_IMPLEMENTATION, FAST_ADMIN);
    }

    // Sent by the current admin. Reversible: it keeps all its roles.
    // Check manually: fastAdmin is not the timelock proposer, and the pausers already hold PAUSER_ROLE.
    // The logs list each call with its parameters, in order, for a multisig.
    function run(Bridge bridge, address timelock, address newImplementation, address fastAdmin) public {
        ProxyAdmin proxyAdmin = ProxyAdmin(address(uint160(uint256(vm.load(address(bridge), ERC1967Utils.ADMIN_SLOT)))));
        bytes32 defaultAdminRole = bridge.DEFAULT_ADMIN_ROLE();
        bytes32 fastAdminRole = Bridge(newImplementation).FAST_ADMIN_ROLE();
        address admin = proxyAdmin.owner();

        console.log("Send from:", admin);

        vm.startBroadcast(admin);

        // Grant roles before the upgrade so there is no gap
        console.log("1. to:", address(bridge));
        console.log("   grantRole(bytes32 role, address account)");
        console.log("   role:", vm.toString(fastAdminRole));
        console.log("   account:", fastAdmin);
        bridge.grantRole(fastAdminRole, fastAdmin);

        console.log("2. to:", address(bridge));
        console.log("   grantRole(bytes32 role, address account)");
        console.log("   role:", vm.toString(defaultAdminRole));
        console.log("   account:", timelock);
        bridge.grantRole(defaultAdminRole, timelock);

        console.log("3. to:", address(proxyAdmin));
        console.log("   upgradeAndCall(address proxy, address implementation, bytes data)");
        console.log("   proxy:", address(bridge));
        console.log("   implementation:", newImplementation);
        console.log("   data: 0x");
        proxyAdmin.upgradeAndCall(ITransparentUpgradeableProxy(address(bridge)), newImplementation, "");

        vm.stopBroadcast();
    }
}
