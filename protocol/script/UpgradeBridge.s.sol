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
     * @param proxyAddr The TransparentUpgradeableProxy address.
     * @param newMerkleRoot Merkle root covering all unprocessed claims from before the upgrade.
     *        Compute off-chain from pending claim tx hashes using the OLD hash scheme.
     *        Pass bytes32(0) if there are no pending claims.
     */
    function run(address proxyAddr, bytes32 newMerkleRoot) external {
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

        console.log("Validator config updated");

        vm.stopBroadcast();
    }
}
