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
     *
     *         Carries the current implementation's immutables over unchanged.
     *         To repoint the bridge at a different pod-side bridge address, use
     *         the three-argument overload.
     * @param proxyAddr The TransparentUpgradeableProxy address.
     */
    function run(address proxyAddr) external {
        Bridge bridge = Bridge(proxyAddr);
        _upgrade(proxyAddr, bridge.BRIDGE_CONTRACT(), bridge.CHAIN_ID());
    }

    /**
     * @notice Code upgrade that also sets the implementation's immutables.
     *         `BRIDGE_CONTRACT` and `CHAIN_ID` live in implementation bytecode,
     *         not storage, so a stale value can only be corrected by deploying a
     *         new implementation — the one-argument overload would faithfully
     *         redeploy the stale one.
     * @param proxyAddr The TransparentUpgradeableProxy address.
     * @param podBridgeAddr The pod-side bridge precompile folded into claim tx hashes.
     * @param srcChainId Pod's chain id, which feeds the claim domain separator.
     */
    function run(address proxyAddr, address podBridgeAddr, uint256 srcChainId) external {
        _upgrade(proxyAddr, podBridgeAddr, srcChainId);
    }

    function _upgrade(address proxyAddr, address podBridgeAddr, uint256 srcChainId) internal {
        Bridge bridge = Bridge(proxyAddr);

        // Read ProxyAdmin from ERC-1967 admin slot
        address proxyAdminAddr = address(uint160(uint256(vm.load(proxyAddr, ERC1967Utils.ADMIN_SLOT))));
        console.log("ProxyAdmin:", proxyAdminAddr);

        address oldPodBridge = bridge.BRIDGE_CONTRACT();
        uint256 oldChainId = bridge.CHAIN_ID();
        uint256 currentVersion = bridge.version();

        console.log("BRIDGE_CONTRACT:", oldPodBridge, "->", podBridgeAddr);
        console.log("CHAIN_ID:", oldChainId, "->", srcChainId);
        console.log("Current version:", currentVersion);

        vm.startBroadcast();

        // 1. Deploy new implementation
        Bridge newImpl = new Bridge(podBridgeAddr, srcChainId);
        console.log("New implementation deployed at:", address(newImpl));

        // 2. Upgrade proxy to new implementation (no reinitializer needed — storage layout is identical)
        ProxyAdmin(proxyAdminAddr).upgradeAndCall(ITransparentUpgradeableProxy(proxyAddr), address(newImpl), "");
        console.log("Proxy upgraded");

        vm.stopBroadcast();

        require(bridge.BRIDGE_CONTRACT() == podBridgeAddr, "BRIDGE_CONTRACT not applied");
        require(bridge.CHAIN_ID() == srcChainId, "CHAIN_ID not applied");

        // `domainSeparator` is stored, derived from CHAIN_ID at the last version
        // update. Changing CHAIN_ID therefore strands it until the next
        // `updateValidatorConfig`, and every claim would verify against the wrong
        // separator in the meantime — fail loudly rather than leave that live.
        bytes32 expected =
            keccak256(abi.encode(keccak256("pod network"), keccak256("attest_tx_bridge"), srcChainId, currentVersion));
        require(
            bridge.domainSeparator() == expected,
            "stored domainSeparator no longer matches CHAIN_ID/version; re-run updateValidatorConfig"
        );

        console.log("Immutables and domain separator verified.");
    }
}
