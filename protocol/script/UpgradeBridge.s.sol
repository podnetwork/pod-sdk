// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {Bridge} from "pod-protocol/Bridge.sol";
import {ProxyAdmin} from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import {ITransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {ERC1967Utils} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol";

contract UpgradeBridge is Script {
    /**
     * @notice Code upgrade only: deploys a fresh implementation and swaps the
     *         proxy to it, preserving all storage. Does NOT touch the version,
     *         validator set, or merkle root — for a version upgrade (validator
     *         rotation) use UpdateBridgeValidatorConfig.s.sol.
     * @param proxyAddr The TransparentUpgradeableProxy address.
     */
    function run(address proxyAddr) external {
        Bridge bridge = Bridge(proxyAddr);

        // Read ProxyAdmin from ERC-1967 admin slot
        address proxyAdminAddr = address(uint160(uint256(vm.load(proxyAddr, ERC1967Utils.ADMIN_SLOT))));
        console.log("ProxyAdmin:", proxyAdminAddr);

        // Read immutables from current implementation
        address podBridgeAddr = bridge.BRIDGE_CONTRACT();
        uint256 srcChainId = bridge.CHAIN_ID();

        console.log("BRIDGE_CONTRACT:", podBridgeAddr);
        console.log("CHAIN_ID:", srcChainId);
        console.log("Current version:", bridge.version());

        vm.startBroadcast();

        // 1. Deploy new implementation
        Bridge newImpl = new Bridge(podBridgeAddr, srcChainId);
        console.log("New implementation deployed at:", address(newImpl));

        // 2. Upgrade proxy to new implementation (no reinitializer needed — storage layout is identical)
        ProxyAdmin(proxyAdminAddr).upgradeAndCall(ITransparentUpgradeableProxy(proxyAddr), address(newImpl), "");
        console.log("Proxy upgraded");

        vm.stopBroadcast();
    }
}
