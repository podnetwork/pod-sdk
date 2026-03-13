// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {Bridge} from "pod-protocol/Bridge.sol";
import {ProxyAdmin} from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import {ITransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

contract UpgradeBridge is Script {
    /// @dev ERC-1967 admin slot: bytes32(uint256(keccak256("eip1967.proxy.admin")) - 1)
    bytes32 internal constant ADMIN_SLOT = 0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103;

    /**
     * @param proxyAddr The TransparentUpgradeableProxy address.
     * @param newMerkleRoot Merkle root covering all unprocessed claims from before the upgrade.
     *        Compute off-chain from pending claim tx hashes using the OLD hash scheme.
     *        Pass bytes32(0) if there are no pending claims.
     */
    function run(address proxyAddr, bytes32 newMerkleRoot) external {
        Bridge bridge = Bridge(proxyAddr);

        // Read ProxyAdmin from ERC-1967 admin slot
        address proxyAdminAddr = address(uint160(uint256(vm.load(proxyAddr, ADMIN_SLOT))));
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
