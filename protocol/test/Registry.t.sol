// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Registry} from "../src/Registry.sol";

contract RegistryTest is Test {
    Registry public registry;
    address public owner = address(1);
    address public validator1;
    address public validator2;
    address public validator3;
    address public validator4;

    uint256 public validator1PrivateKey = 0x1234;
    uint256 public validator2PrivateKey = 0x5678;
    uint256 public validator3PrivateKey = 0x9abc;
    uint256 public validator4PrivateKey = 0xdef0;

    function setUp() public {
        validator1 = vm.addr(validator1PrivateKey);
        validator2 = vm.addr(validator2PrivateKey);
        validator3 = vm.addr(validator3PrivateKey);
        validator4 = vm.addr(validator4PrivateKey);

        address[] memory initialValidators = new address[](2);
        initialValidators[0] = validator1;
        initialValidators[1] = validator2;
        vm.prank(owner);
        registry = new Registry(initialValidators, 1);
    }

    function test_Initialization() public view {
        assertTrue(registry.activeValidators(validator1));
        assertTrue(registry.activeValidators(validator2));
        assertFalse(registry.activeValidators(validator3));
        assertEq(registry.validatorCount(), 2);
        assertEq(registry.adversarialResilience(), 1);
        assertTrue(registry.domainSeperator() != bytes32(0));
    }

    function test_UpdateConfig_AddValidator() public {
        address[] memory addValidators = new address[](1);
        addValidators[0] = validator3;
        address[] memory removeValidators = new address[](0);

        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit Registry.ValidatorAdded(validator3);
        registry.updateConfig(1, addValidators, removeValidators);

        assertTrue(registry.activeValidators(validator3));
        assertEq(registry.validatorCount(), 3);
    }

    function test_UpdateConfig_RemoveValidator() public {
        address[] memory addValidators = new address[](0);
        address[] memory removeValidators = new address[](1);
        removeValidators[0] = validator1;

        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit Registry.ValidatorRemoved(validator1);
        registry.updateConfig(1, addValidators, removeValidators);

        assertFalse(registry.activeValidators(validator1));
        assertEq(registry.validatorCount(), 1);
    }

    function test_UpdateConfig_AddAndRemove() public {
        address[] memory addValidators = new address[](1);
        addValidators[0] = validator3;
        address[] memory removeValidators = new address[](1);
        removeValidators[0] = validator1;

        vm.prank(owner);
        registry.updateConfig(1, addValidators, removeValidators);

        assertFalse(registry.activeValidators(validator1));
        assertTrue(registry.activeValidators(validator3));
        assertEq(registry.validatorCount(), 2);
    }

    function test_UpdateConfig_RevertIfNotOwner() public {
        address[] memory addValidators = new address[](1);
        addValidators[0] = validator3;
        address[] memory removeValidators = new address[](0);

        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", address(this)));
        registry.updateConfig(1, addValidators, removeValidators);
    }

    function test_UpdateConfig_RevertIfZeroAddress() public {
        address[] memory addValidators = new address[](1);
        addValidators[0] = address(0);
        address[] memory removeValidators = new address[](0);

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(Registry.ValidatorIsZeroAddress.selector));
        registry.updateConfig(1, addValidators, removeValidators);
    }

    function test_UpdateConfig_RevertIfDuplicate() public {
        address[] memory addValidators = new address[](1);
        addValidators[0] = validator1; // already exists
        address[] memory removeValidators = new address[](0);

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(Registry.DuplicateValidator.selector));
        registry.updateConfig(1, addValidators, removeValidators);
    }

    function test_UpdateConfig_RevertIfValidatorDoesNotExist() public {
        address[] memory addValidators = new address[](0);
        address[] memory removeValidators = new address[](1);
        removeValidators[0] = validator3; // doesn't exist

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(Registry.ValidatorDoesNotExist.selector));
        registry.updateConfig(1, addValidators, removeValidators);
    }

    function test_UpdateConfig_RevertIfInvalidResilience() public {
        address[] memory addValidators = new address[](0);
        address[] memory removeValidators = new address[](0);

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(Registry.InvalidAdverserialResilience.selector));
        registry.updateConfig(0, addValidators, removeValidators); // 0 is invalid

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(Registry.InvalidAdverserialResilience.selector));
        registry.updateConfig(3, addValidators, removeValidators); // > validatorCount is invalid
    }

    function test_ComputeTxWeight() public {
        bytes32 txHash = keccak256("test transaction");

        // Create sorted signatures (addresses must be in ascending order)
        address[] memory signers = new address[](2);
        uint256[] memory keys = new uint256[](2);
        signers[0] = validator1;
        signers[1] = validator2;
        keys[0] = validator1PrivateKey;
        keys[1] = validator2PrivateKey;

        // Sort by address
        if (signers[0] > signers[1]) {
            (signers[0], signers[1]) = (signers[1], signers[0]);
            (keys[0], keys[1]) = (keys[1], keys[0]);
        }

        bytes memory aggregatedSignatures;
        for (uint256 i = 0; i < 2; i++) {
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(keys[i], txHash);
            aggregatedSignatures = abi.encodePacked(aggregatedSignatures, r, s, v);
        }

        (uint256 weight, uint256 n, uint256 f) = registry.computeTxWeight(txHash, aggregatedSignatures);

        assertEq(weight, 2);
        assertEq(n, 2);
        assertEq(f, 1);
    }

    function test_ComputeTxWeight_RevertIfSignatureOrderInvalid() public {
        bytes32 txHash = keccak256("test transaction");

        // Create signatures in wrong order (descending by address)
        address[] memory signers = new address[](2);
        uint256[] memory keys = new uint256[](2);
        signers[0] = validator1;
        signers[1] = validator2;
        keys[0] = validator1PrivateKey;
        keys[1] = validator2PrivateKey;

        // Sort descending (wrong order)
        if (signers[0] < signers[1]) {
            (signers[0], signers[1]) = (signers[1], signers[0]);
            (keys[0], keys[1]) = (keys[1], keys[0]);
        }

        bytes memory aggregatedSignatures;
        for (uint256 i = 0; i < 2; i++) {
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(keys[i], txHash);
            aggregatedSignatures = abi.encodePacked(aggregatedSignatures, r, s, v);
        }

        vm.expectRevert(abi.encodeWithSelector(Registry.InvalidSignatureOrder.selector));
        registry.computeTxWeight(txHash, aggregatedSignatures);
    }

    function test_ComputeTxWeight_RevertIfSignerNotActive() public {
        bytes32 txHash = keccak256("test transaction");

        // Sign with validator3 who is not active
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(validator3PrivateKey, txHash);
        bytes memory aggregatedSignatures = abi.encodePacked(r, s, v);

        vm.expectRevert(abi.encodeWithSelector(Registry.SignerNotActiveValidator.selector));
        registry.computeTxWeight(txHash, aggregatedSignatures);
    }
}
