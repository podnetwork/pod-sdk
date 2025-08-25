// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";

contract BaseDeployer is Script {
    function getValidatorAddresses() internal view returns (address[] memory) {
        // Read validator addresses from environment variable
        string memory committeeKeys = vm.envString("POD_COMMITTEE_KEYS");

        // Split comma-separated addresses and parse them
        string[] memory addressStrings = vm.split(committeeKeys, ",");
        address[] memory initialValidators = new address[](addressStrings.length);

        for (uint256 i = 0; i < addressStrings.length; i++) {
            initialValidators[i] = vm.parseAddress(addressStrings[i]);
        }

        require(initialValidators.length > 0, "No validator addresses provided");

        return initialValidators;
    }
}
