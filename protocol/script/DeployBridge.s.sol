// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {BaseDeployer} from "./BaseDeployer.s.sol";
import {console} from "forge-std/console.sol";
import {Bridge} from "pod-protocol/Bridge.sol";
import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

library BridgeDeployer {
    function deploy(
        address podBridgeAddr,
        uint256 srcChainId,
        address admin,
        address[] memory validators,
        uint64 adversarialResilience,
        uint256 version,
        bytes32 merkleRoot
    ) internal returns (Bridge proxy, Bridge implementation) {
        // Deploy implementation
        implementation = new Bridge(podBridgeAddr, srcChainId);

        // Encode initialize call
        bytes memory initData =
            abi.encodeCall(Bridge.initialize, (admin, validators, adversarialResilience, version, merkleRoot));

        // Deploy proxy
        proxy = Bridge(address(new TransparentUpgradeableProxy(address(implementation), admin, initData)));
    }
}

contract Deploy is BaseDeployer {
    function run(address podBridgeAddr, uint256 srcChainId, uint256 version, bytes32 merkleRoot)
        external
        returns (address proxy)
    {
        address[] memory initialValidators = getValidatorAddresses();
        vm.startBroadcast();

        uint8 f = uint8((initialValidators.length - 1) / 5);

        (Bridge bridgeProxy, Bridge implementation) =
            BridgeDeployer.deploy(podBridgeAddr, srcChainId, msg.sender, initialValidators, f, version, merkleRoot);

        vm.stopBroadcast();

        console.log("Bridge implementation deployed at:", address(implementation));
        console.log("Bridge proxy deployed at:", address(bridgeProxy));
        return address(bridgeProxy);
    }
}
