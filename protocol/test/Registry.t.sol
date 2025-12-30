// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Registry} from "../src/Registry.sol";

contract RegistryTest is Test {
    Registry public registry;
    address public owner = address(1);
    address public validator1 = address(2);
    address public validator2 = address(3);
    address public validator3 = address(4);
    address public validator4 = address(5);

    function setUp() public {
        address[] memory initialValidators = new address[](2);
        initialValidators[0] = validator1;
        initialValidators[1] = validator2;
        vm.prank(owner);
        registry = new Registry(initialValidators, 1);
    }

    function test_Initialization() public view {
        assertEq(registry.validatorIndex(validator1), 1);
        assertEq(registry.validatorIndex(validator2), 2);
        assertEq(registry.activeValidatorBitmap(), (1 << 0) | (1 << 1));
    }

    function test_UpdateConfig_AddValidator() public {
        uint256 beforeHistory = registry.getHistoryLength();

        address[] memory newValidators = new address[](1);
        newValidators[0] = validator3;
        address[] memory removedValidators = new address[](0);

        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit Registry.ValidatorAdded(validator3);
        registry.updateConfig(newValidators, removedValidators, 1);

        assertEq(registry.validatorIndex(validator3), 3);
        assertEq(registry.getHistoryLength(), beforeHistory + 1);
    }

    function test_UpdateConfig_RevertIfNotOwner() public {
        address[] memory newValidators = new address[](1);
        newValidators[0] = validator3;
        address[] memory removedValidators = new address[](0);

        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", address(this)));
        registry.updateConfig(newValidators, removedValidators, 1);
    }

    function test_UpdateConfig_RevertIfZeroAddress() public {
        address[] memory newValidators = new address[](1);
        newValidators[0] = address(0);
        address[] memory removedValidators = new address[](0);

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSignature("ValidatorIsZeroAddress()"));
        registry.updateConfig(newValidators, removedValidators, 1);
    }

    function test_UpdateConfig_RevertIfAlreadyExists() public {
        address[] memory newValidators = new address[](1);
        newValidators[0] = validator1;
        address[] memory removedValidators = new address[](0);

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSignature("ValidatorAlreadyExists()"));
        registry.updateConfig(newValidators, removedValidators, 1);
    }

    function test_UpdateConfig_RevertIfMaxCountReached() public {
        vm.startPrank(owner);
        for (uint8 i = 0; i < 253; i++) {
            address[] memory loopValidators = new address[](1);
            loopValidators[0] = address(uint160(1000 + i));
            address[] memory loopRemoved = new address[](0);
            registry.updateConfig(loopValidators, loopRemoved, 1);
        }

        address[] memory finalValidators = new address[](1);
        finalValidators[0] = address(9999);
        address[] memory finalRemoved = new address[](0);

        vm.expectRevert(abi.encodeWithSignature("MaxValidatorCountReached()"));
        registry.updateConfig(finalValidators, finalRemoved, 1);
        vm.stopPrank();
    }

    function test_UpdateConfig_RemoveValidator() public {
        uint256 beforeHistory = registry.getHistoryLength();

        address[] memory newValidators = new address[](0);
        address[] memory removedValidators = new address[](1);
        removedValidators[0] = validator1;

        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit Registry.ValidatorRemoved(validator1);
        registry.updateConfig(newValidators, removedValidators, 1);

        // index does not change after removal
        assertEq(registry.validatorIndex(validator1), 1);
        // but validator is no longer active
        assertEq(registry.activeValidatorBitmap() & (1 << 0), 0);
        assertEq(registry.getHistoryLength(), beforeHistory + 1);
    }

    function test_BanValidator() public {
        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit Registry.ValidatorBanned(validator1);
        registry.banValidator(validator1);

        // index does not change after banning
        assertEq(registry.validatorIndex(validator1), 1);
        assertTrue(registry.isValidatorBanned(validator1));
    }

    function test_BanValidator_RevertIfNotOwner() public {
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", address(this)));
        registry.banValidator(validator1);
    }

    function test_BanValidator_RevertIfNotExists() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSignature("ValidatorDoesNotExist()"));
        registry.banValidator(validator3);
    }

    function test_BanValidatorTwiceReverts() public {
        vm.prank(owner);
        registry.banValidator(validator1);

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSignature("CallerBanned()"));
        registry.banValidator(validator1);
    }

    function test_UnbanValidator() public {
        vm.prank(owner);
        registry.banValidator(validator1);
        assertTrue(registry.isValidatorBanned(validator1));

        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit Registry.ValidatorUnbanned(validator1);
        registry.unbanValidator(validator1);
        assertFalse(registry.isValidatorBanned(validator1));
    }

    function test_UnbanValidator_RevertIfNotBanned() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSignature("ValidatorNotBanned()"));
        registry.unbanValidator(validator1);
    }

    function test_UnbanValidatorAndReactivate() public {
        // First deactivate
        vm.prank(validator1);
        registry.deactivate(validator1);

        // Then ban
        vm.prank(owner);
        registry.banValidator(validator1);

        // Note: reactivate doesn't check if validator is banned, so we can reactivate a banned validator
        // This just sets the active bit, but the banned bit is separate
        vm.prank(validator1);
        registry.reactivate(validator1);
        assertTrue((registry.activeValidatorBitmap() & (1 << 0)) != 0);
        assertTrue(registry.isValidatorBanned(validator1));

        // Unban the validator
        vm.prank(owner);
        registry.unbanValidator(validator1);
        assertFalse(registry.isValidatorBanned(validator1));
    }

    function test_ActiveValidatorBitmap_AfterUpdateConfig() public {
        address[] memory newValidators = new address[](1);
        newValidators[0] = validator3;
        address[] memory removedValidators = new address[](0);

        vm.prank(owner);
        registry.updateConfig(newValidators, removedValidators, 1);

        uint256 bitmapAfterAdd = registry.activeValidatorBitmap();
        assertEq(bitmapAfterAdd & (1 << 2), (1 << 2));

        address[] memory newValidators2 = new address[](0);
        address[] memory removedValidators2 = new address[](1);
        removedValidators2[0] = validator3;

        vm.prank(owner);
        registry.updateConfig(newValidators2, removedValidators2, 1);

        uint256 bitmapAfterRemove = registry.activeValidatorBitmap();
        assertEq(bitmapAfterRemove & (1 << 2), 0);
    }

    function test_DeactivateAndReactivate() public {
        uint256 beforeHistory = registry.getHistoryLength();

        vm.prank(validator1);
        vm.expectEmit(true, false, false, true);
        emit Registry.ValidatorDeactivated(validator1);
        registry.deactivate(validator1);
        assertEq((registry.activeValidatorBitmap() & (1 << 0)), 0);
        assertEq(registry.getHistoryLength(), beforeHistory + 1);

        vm.prank(validator1);
        vm.expectEmit(true, false, false, true);
        emit Registry.ValidatorReactivated(validator1);
        registry.reactivate(validator1);
        assertEq((registry.activeValidatorBitmap() & (1 << 0)), (1 << 0));
        assertEq(registry.getHistoryLength(), beforeHistory + 2);
    }

    function test_DeactivateByOwner() public {
        vm.prank(owner);
        registry.deactivate(validator1);
        assertEq((registry.activeValidatorBitmap() & (1 << 0)), 0);
    }

    function test_ReactivateByOwner() public {
        vm.prank(validator1);
        registry.deactivate(validator1);

        vm.prank(owner);
        registry.reactivate(validator1);
        assertEq((registry.activeValidatorBitmap() & (1 << 0)), (1 << 0));
    }

    function test_Deactivate_RevertIfAlreadyInactive() public {
        vm.prank(validator1);
        registry.deactivate(validator1);

        vm.prank(validator1);
        vm.expectRevert(abi.encodeWithSignature("CallerAlreadyInactive()"));
        registry.deactivate(validator1);
    }

    function test_Reactivate_RevertIfAlreadyActive() public {
        vm.prank(validator1);
        vm.expectRevert(abi.encodeWithSignature("CallerAlreadyActive()"));
        registry.reactivate(validator1);
    }

    function test_Deactivate_RevertIfNotValidator() public {
        // When msg.sender == validator but validator doesn't exist, it reverts with ValidatorDoesNotExist
        vm.prank(address(1337));
        vm.expectRevert(abi.encodeWithSignature("ValidatorDoesNotExist()"));
        registry.deactivate(address(1337));
    }

    function test_Deactivate_RevertIfNotOwnerOrSelf() public {
        // When msg.sender != validator and msg.sender != owner, it reverts with CallerNotValidator
        vm.prank(address(1337));
        vm.expectRevert(abi.encodeWithSignature("CallerNotValidator()"));
        registry.deactivate(validator1);
    }

    function test_Reactivate_RevertIfNotValidator() public {
        // When msg.sender == validator but validator doesn't exist, it reverts with ValidatorDoesNotExist
        vm.prank(address(1337));
        vm.expectRevert(abi.encodeWithSignature("ValidatorDoesNotExist()"));
        registry.reactivate(address(1337));
    }

    function test_Reactivate_RevertIfNotOwnerOrSelf() public {
        vm.prank(validator1);
        registry.deactivate(validator1);

        // When msg.sender != validator and msg.sender != owner, it reverts with CallerNotValidator
        vm.prank(address(1337));
        vm.expectRevert(abi.encodeWithSignature("CallerNotValidator()"));
        registry.reactivate(validator1);
    }

    function test_SnapshotCreatedOnUpdateConfigAndDeactivateReactivate() public {
        uint256 initialHistory = registry.getHistoryLength();

        address[] memory newValidators = new address[](1);
        newValidators[0] = validator3;
        address[] memory removedValidators = new address[](0);

        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit Registry.SnapshotCreated(block.timestamp, (1 << 0) | (1 << 1));
        registry.updateConfig(newValidators, removedValidators, 1);
        assertEq(registry.getHistoryLength(), initialHistory + 1);

        vm.prank(validator1);
        vm.expectEmit(true, false, false, true);
        emit Registry.SnapshotCreated(block.timestamp, (1 << 0) | (1 << 1) | (1 << 2));
        registry.deactivate(validator1);
        assertEq(registry.getHistoryLength(), initialHistory + 2);

        vm.prank(validator1);
        vm.expectEmit(true, false, false, true);
        emit Registry.SnapshotCreated(block.timestamp, (1 << 1) | (1 << 2));
        registry.reactivate(validator1);
        assertEq(registry.getHistoryLength(), initialHistory + 3);
    }

    function test_GetSnapshotAtIndex() public {
        address[] memory newValidators = new address[](1);
        newValidators[0] = validator3;
        address[] memory removedValidators = new address[](0);

        vm.prank(owner);
        registry.updateConfig(newValidators, removedValidators, 1);
        uint256 index = registry.getHistoryLength() - 1;
        Registry.Snapshot memory snapshot = registry.getSnapshotAtIndex(index);
        assertGt(snapshot.expiryTimestamp, 0);
        assertTrue(snapshot.bitmap & (1 << 0) != 0);
        assertTrue(snapshot.bitmap & (1 << 1) != 0);
    }

    function test_GetHistory() public {
        uint256 before = registry.getHistoryLength();
        address[] memory newValidators = new address[](1);
        newValidators[0] = validator3;
        address[] memory removedValidators = new address[](0);

        vm.prank(owner);
        registry.updateConfig(newValidators, removedValidators, 1);
        assertEq(registry.getHistoryLength(), before + 1);
    }

    function test_GetValidators() public {
        address[] memory newValidators = new address[](1);
        newValidators[0] = validator3;
        address[] memory removedValidators = new address[](0);

        vm.prank(owner);
        registry.updateConfig(newValidators, removedValidators, 1);

        uint256 snapshotIndex = registry.getHistoryLength() - 1;
        address[] memory validators = registry.getValidators(snapshotIndex);
        assertEq(validators.length, 2);
        assertEq(validators[0], validator1);
        assertEq(validators[1], validator2);
    }

    function test_GetValidatorsAfterDeactivation() public {
        vm.prank(validator1);
        registry.deactivate(validator1);

        address[] memory newValidators = new address[](1);
        newValidators[0] = validator3;
        address[] memory removedValidators = new address[](0);

        vm.prank(owner);
        registry.updateConfig(newValidators, removedValidators, 1);

        // Snapshot 0 was taken BEFORE deactivation, so both validators are active
        // Snapshot 1 was taken BEFORE updateConfig, with only validator2 active
        uint256 snapshotIndex = registry.getHistoryLength() - 2; // snapshot 0
        address[] memory validators = registry.getValidators(snapshotIndex);
        assertEq(validators.length, 2);
        assertEq(validators[0], validator1);
        assertEq(validators[1], validator2);

        // Check snapshot 1 (after deactivation but before adding validator3)
        address[] memory validators2 = registry.getValidators(registry.getHistoryLength() - 1);
        assertEq(validators2.length, 2);
        assertEq(validators2[0], validator2); // only validator2 is active
    }
}
