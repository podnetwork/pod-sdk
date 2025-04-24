// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/console2.sol";

contract DIDRegistry {
    struct Operation {
        string operationJSON;
        address owner;
    }
    // Mapping from DID identifier to its latest operation data
    mapping(string => Operation) private operations;

    // Events
    event DIDCreated(string indexed did, address owner);
    event DIDUpdated(string indexed did);

    function createDID(string calldata did, string calldata operation) external {
        console2.log("creating DID: %s", did);
        require(bytes(did).length > 0, "DID cannot be empty");
        require(operations[did].owner == address(0), "DID already exists");
        require(bytes(operation).length > 0, "Operation cannot be empty");

        operations[did] = Operation({owner: msg.sender, operationJSON: operation});
        emit DIDCreated(did, msg.sender);
    }

    function updateDID(string calldata did, string calldata operation) external {
        require(operations[did].owner == msg.sender, "Unauthorized");
        require(bytes(did).length > 0, "DID cannot be empty");
        require(operations[did].owner != address(0), "DID doesn't exist");
        require(bytes(operation).length > 0, "Operation cannot be empty");

        operations[did].operationJSON = operation;

        emit DIDUpdated(did);
    }

    function getLastOperation(string calldata did) external view returns (string memory operation) {
        return operations[did].operationJSON;
    }
}
