// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/PodRegistry.sol";

contract PodRegistryTest is Test {
    PodRegistry public registry;
    address public owner = address(1);
    address public validator1 = address(2);
    address public validator2 = address(3);
    address public validator3 = address(4);
    address public validator4 = address(5);

    function setUp() public {
        vm.startPrank(owner);
        address[] memory initialValidators = new address[](2);
        initialValidators[0] = validator1;
        initialValidators[1] = validator2;
        registry = new PodRegistry(initialValidators);
        vm.stopPrank();
    }

    function test_Initialization() public view {
        assertEq(registry.validatorCount(), 2);
        assertEq(registry.validatorIndex(validator1), 1);
        assertEq(registry.validatorIndex(validator2), 2);
    }

    function test_AddValidator() public {
        vm.startPrank(owner);
        registry.addValidator(validator3);

        assertEq(registry.validatorCount(), 3);
        assertEq(registry.validatorIndex(validator3), 3);
    }

    function test_AddValidator_RevertIfNotOwner() public {
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", address(this)));
        registry.addValidator(validator3);
    }

    function test_AddValidator_RevertIfZeroAddress() public {
        vm.startPrank(owner);
        vm.expectRevert("pod: validator is the zero address");
        registry.addValidator(address(0));
    }

    function test_AddValidator_RevertIfAlreadyExists() public {
        vm.startPrank(owner);
        vm.expectRevert("pod: validator already exists");
        registry.addValidator(validator1);
    }

    function test_RemoveValidator() public {
        vm.startPrank(owner);
        registry.removeValidator(validator1);

        assertEq(registry.validatorCount(), 1);
        assertEq(registry.validatorIndex(validator1), 0);
    }

    function test_RemoveValidator_RevertIfNotOwner() public {
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", address(this)));
        registry.removeValidator(validator1);
    }

    function test_RemoveValidator_RevertIfNotExists() public {
        vm.startPrank(owner);
        vm.expectRevert("pod: validator does not exist");
        registry.removeValidator(validator3);
    }

    function test_ComputeWeight() public view {
        address[] memory subset = new address[](3);
        subset[0] = validator1;
        subset[1] = validator2;
        subset[2] = validator3; // Not in registry

        uint256 weight = registry.computeWeight(subset);
        assertEq(weight, 2);
    }

    function test_ComputeWeight_WithDuplicates() public view {
        address[] memory subset = new address[](4);
        subset[0] = validator1;
        subset[1] = validator1; // Duplicate
        subset[2] = validator2;
        subset[3] = validator2; // Duplicate

        uint256 weight = registry.computeWeight(subset);
        assertEq(weight, 2);
    }

    function test_GetFaultTolerance() public view {
        assertEq(registry.getFaultTolerance(), 0); // 2/3 = 0
    }

    function test_GetFaultTolerance_WithMoreValidators() public {
        vm.startPrank(owner);
        registry.addValidator(validator3);
        registry.addValidator(validator4);
        vm.stopPrank();

        assertEq(registry.getFaultTolerance(), 1); // 4/3 = 1
    }

    function test_AddValidator_RevertIfMaxCountReached() public {
        vm.startPrank(owner);

        for (uint8 i = 0; i < 253; i++) {
            address newValidator = address(uint160(1000 + i));
            registry.addValidator(newValidator);
        }

        vm.expectRevert("pod: max validator count reached");
        registry.addValidator(address(9999));

        assertEq(registry.validatorCount(), 255);
    }
}
