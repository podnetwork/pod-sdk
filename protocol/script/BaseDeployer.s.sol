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

    function getValidatorHostsAndPorts() internal view returns (string[] memory hosts, uint16[] memory ports) {
        // Read validator endpoints from environment variable
        string memory committeeHosts = vm.envString("POD_COMMITTEE_HOSTS");

        // Split comma-separated host:port pairs
        string[] memory entries = vm.split(committeeHosts, ",");

        uint256 len = entries.length;
        hosts = new string[](len);
        ports = new uint16[](len);

        for (uint256 i = 0; i < len; i++) {
            // Split each entry on ":" (host:port)
            string[] memory parts = vm.split(entries[i], ":");
            require(parts.length == 2, "invalid host:port entry");

            hosts[i] = parts[0];

            // Parse port string into uint16
            uint256 portVal = vm.parseUint(parts[1]);
            require(portVal > 0 && portVal <= type(uint16).max, "invalid port");
            ports[i] = uint16(portVal);
        }

        require(len > 0, "No validator hosts provided");
    }
}
