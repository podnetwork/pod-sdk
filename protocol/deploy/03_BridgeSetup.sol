// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {console, Script} from "forge-std/Script.sol";
import {Bridge} from "pod-protocol/Bridge.sol";
import {DepositWaitingList} from "pod-protocol/DepositWaitingList.sol";

contract BridgeSetup is Script {
    function run(
        Bridge bridge,
        DepositWaitingList waitlist,
        address[] memory tokens,
        address[] memory addValidators
    ) public {
        address admin = msg.sender;

        address[] memory removeValidators = new address[](1);
        removeValidators[0] = admin;

        vm.startBroadcast();

        // Grant RELAYER_ROLE on the bridge to the waitlist contract
        bridge.grantRole(bridge.RELAYER_ROLE(), address(waitlist));

        // Approve tokens on the waitlist for bridge transfers
        for (uint256 i = 0; i < tokens.length; i++) {
            waitlist.approveToken(tokens[i]);
        }

        // Update validator config: keep existing version and resilience, add real validators, remove admin
        bridge.updateValidatorConfig(
            bridge.adversarialResilience(),
            bridge.version(),
            bytes32(0),
            addValidators,
            removeValidators
        );

        vm.stopBroadcast();
    }
}
