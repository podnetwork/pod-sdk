// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {console, Script} from "forge-std/Script.sol";
import {Bridge} from "pod-protocol/Bridge.sol";
import {BridgeDeployer} from "../script/DeployBridge.s.sol";
import {DepositWaitingList} from "pod-protocol/DepositWaitingList.sol";

contract DeployArbitrumBridgeAndWaitlist is Script {
    function run() public {
        address adminOnArbitrum = address(0x34B16959F6BccEe214B370dE66674A0563F36107);
        address relayerOnArbitrum = address(0x1212ED49e656486034103b765a8834Fb938bA48b);
        address bridgePrecompileOnPod = address(0x50d0000000000000000000000000000000000001);
        uint256 podChainId = 0x50d;
        uint256 version = 0;

        // The aim of this deployment is to make the waitlist work.
        // The waitlist depends heavily on the bridge, so we are
        // forced to deploy the bridge as well. We config the bridge
        // the admin as the only validator, so that claims fail.
        // In future, when we intend to make the bridge work,
        // we should remove the admin validator and add the actual
        // validators.
        address[] memory initialValidators = new address[](1);
        initialValidators[0] = adminOnArbitrum;
        uint64 f = 0;
        bytes32 merkleRoot = bytes32(0);

        vm.startBroadcast();

        (Bridge bridgeProxy, Bridge implementation) = BridgeDeployer.deploy(
            bridgePrecompileOnPod, podChainId, adminOnArbitrum, initialValidators, f, version, merkleRoot
        );

        DepositWaitingList waitingList = new DepositWaitingList(address(bridgeProxy), adminOnArbitrum, relayerOnArbitrum);

        vm.stopBroadcast();

        console.log("Bridge implementation deployed at:", address(implementation));
        console.log("Bridge proxy deployed at:", address(bridgeProxy));
        console.log("WaitingList deployed at:", address(waitingList));
    }
}
