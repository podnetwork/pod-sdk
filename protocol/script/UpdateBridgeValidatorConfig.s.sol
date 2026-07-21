// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {Bridge} from "pod-protocol/Bridge.sol";

/**
 * @notice Bridge version upgrade (validator rotation): submits the single
 *         atomic `updateValidatorConfig` call that rotates the validator set,
 *         bumps the domain-separator version (killing all previous
 *         certificates), and installs the Merkle root that keeps pre-upgrade
 *         withdrawals claimable.
 *
 *         Inputs via env (driven by pod's scripts/bridge-upgrade.sh, which
 *         computes NEW_MERKLE_ROOT itself with `node bridge-merkle-root`):
 *           BRIDGE_PROXY             proxy address
 *           NEW_VERSION              new version (> current; fits uint32)
 *           NEW_RESILIENCE           new adversarial resilience
 *           NEW_MERKLE_ROOT          root over all pre-upgrade withdrawal claims
 *           ADD_VALIDATORS           comma-separated addresses (optional)
 *           REMOVE_VALIDATORS        comma-separated addresses (optional)
 *           ALLOW_EMPTY_MERKLE_ROOT  "true" to permit bytes32(0) (a bridge
 *                                    with zero historical withdrawals only)
 */
contract UpdateBridgeValidatorConfig is Script {
    function run() external {
        Bridge bridge = Bridge(vm.envAddress("BRIDGE_PROXY"));
        uint256 newVersion = vm.envUint("NEW_VERSION");
        uint64 newResilience = uint64(vm.envUint("NEW_RESILIENCE"));
        bytes32 newMerkleRoot = vm.envBytes32("NEW_MERKLE_ROOT");
        address[] memory addValidators = vm.envOr("ADD_VALIDATORS", ",", new address[](0));
        address[] memory removeValidators = vm.envOr("REMOVE_VALIDATORS", ",", new address[](0));

        uint256 oldVersion = bridge.version();
        require(newVersion > oldVersion, "NEW_VERSION must exceed the current version");
        require(newVersion <= type(uint32).max, "NEW_VERSION must fit uint32 (merkle proof encoding)");
        if (newMerkleRoot == bytes32(0)) {
            require(
                vm.envOr("ALLOW_EMPTY_MERKLE_ROOT", false),
                "zero merkle root would strand every pre-upgrade withdrawal; set ALLOW_EMPTY_MERKLE_ROOT=true only for a bridge with no withdrawals"
            );
        }

        console.log("Bridge:", address(bridge));
        console.log("Version:", oldVersion, "->", newVersion);
        console.log("Resilience ->", newResilience);
        console.log("Merkle root:");
        console.logBytes32(newMerkleRoot);
        console.log("Adding %d / removing %d validators", addValidators.length, removeValidators.length);

        vm.startBroadcast();
        bridge.updateValidatorConfig(newResilience, newVersion, newMerkleRoot, addValidators, removeValidators);
        vm.stopBroadcast();

        require(bridge.version() == newVersion, "version not updated");
        require(bridge.merkleRoot() == newMerkleRoot, "merkle root not updated");
        console.log("Validator config updated.");
    }
}
