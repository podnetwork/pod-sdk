// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {DeterministicDeployFactory} from "pod-protocol/DeterministicDeployFactory.sol";
import {BridgeDepositWithdraw} from "pod-protocol/BridgeDepositWithdraw.sol";

contract DeterministicDeployScript is Script {
    function run(address factory, uint256 salt, bytes calldata constructorArgs) external {
        bytes memory bytecode = type(BridgeDepositWithdraw).creationCode;
        bytes memory initCode = abi.encodePacked(bytecode, constructorArgs);

        console.log("Factory:", factory);
        console.log("Salt:", salt);
        console.log("Bytecode length:", bytecode.length);
        console.log("Constructor args length:", constructorArgs.length);

        address predicted = DeterministicDeployFactory(factory).getAddress(initCode, salt);
        console.log("Predicted address:", predicted);

        vm.broadcast();
        DeterministicDeployFactory(factory).deploy(initCode, salt);

        console.log("Deployed to:", predicted);
    }
}
