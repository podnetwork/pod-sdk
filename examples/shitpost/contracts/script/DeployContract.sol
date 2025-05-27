pragma solidity ^0.8.25;

import "forge-std/Script.sol";
import "../src/CDNToWalrusRegistry.sol";
import {console} from "@forge/console.sol";

contract DeployContract is Script {
    function run() external {
        uint256 deployerPK = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerPK);

        CDNToWalrusRegistry registry = new CDNToWalrusRegistry();

        vm.stopBroadcast();
        
        console.log("CDNToWalrusRegistry deployed at:", address(registry));
        console.log("Owner set to:", registry.owner());
    }
}
