// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {DepositWaitingList} from "pod-protocol/DepositWaitingList.sol";

contract DeployDepositWaitingList is Script {
    function run(address bridge, address callContract, address admin) external returns (address) {
        vm.startBroadcast();

        DepositWaitingList waitingList = new DepositWaitingList(bridge, callContract, admin);

        vm.stopBroadcast();

        console.log("DepositWaitingList deployed at:", address(waitingList));
        return address(waitingList);
    }
}
