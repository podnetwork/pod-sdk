// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {Bridge} from "pod-protocol/Bridge.sol";

contract GrantRelayerRole is Script {
    function run(address bridge, address relayer) external {
        vm.startBroadcast();
        Bridge b = Bridge(bridge);
        b.grantRole(b.RELAYER_ROLE(), relayer);
        vm.stopBroadcast();
        console.log("Granted RELAYER_ROLE on Bridge to:", relayer);
    }
}
