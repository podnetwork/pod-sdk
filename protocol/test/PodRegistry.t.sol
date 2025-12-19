// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {PodRegistry} from "../src/PodRegistry.sol";
import {IPodRegistry} from "../src/interfaces/IPodRegistry.sol";

import {console} from "forge-std/console.sol";

contract PodRegistryTest is Test {
    PodRegistry public registry;
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
        registry = new PodRegistry(initialValidators, 1);
    }

    function test_Initialization() public view {
        assertEq(registry.validatorIndex(validator1), 1);
        assertEq(registry.validatorIndex(validator2), 2);
        assertEq(registry.getHistoryLength(), 1);
    }

    function test_AddValidator() public {
        uint256 beforeHistory = registry.getHistoryLength();

        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit IPodRegistry.ValidatorAdded(validator3);
        registry.addValidator(validator3);

        assertEq(registry.getActiveValidatorCount(), 3);
        assertEq(registry.validatorIndex(validator3), 3);
        assertEq(registry.getHistoryLength(), beforeHistory + 1);
    }

    function test_AddValidator_RevertIfNotOwner() public {
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", address(this)));
        registry.addValidator(validator3);
    }

    function test_AddValidator_RevertIfZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSignature("ValidatorIsZeroAddress()"));
        registry.addValidator(address(0));
    }

    function test_AddValidator_RevertIfAlreadyExists() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSignature("ValidatorAlreadyExists()"));
        registry.addValidator(validator1);
    }

    function test_AddValidator_RevertIfMaxCountReached() public {
        vm.startPrank(owner);
        for (uint8 i = 0; i < 253; i++) {
            address newValidator = address(uint160(1000 + i));
            registry.addValidator(newValidator);
        }

        vm.expectRevert(abi.encodeWithSignature("MaxValidatorCountReached()"));
        registry.addValidator(address(9999));
        vm.stopPrank();
    }

    function test_BanValidator() public {
        uint256 beforeHistory = registry.getHistoryLength();

        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit IPodRegistry.ValidatorBanned(validator1);
        registry.banValidator(validator1);

        assertEq(registry.getActiveValidatorCount(), 1);
        // index does not change after banning
        assertEq(registry.validatorIndex(validator1), 1);
        assertEq(registry.getHistoryLength(), beforeHistory + 1);
    }

    function test_BanValidator_DoesNotCreateSnapshotWhenValidatorIsInactive() public {
        vm.prank(validator1);
        registry.deactivate();

        uint256 beforeHistory = registry.getHistoryLength();
        vm.prank(owner);
        registry.banValidator(validator1);
        assertEq(registry.getHistoryLength(), beforeHistory);
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
        emit IPodRegistry.ValidatorUnbanned(validator1);
        registry.unbanValidator(validator1);
        assertFalse(registry.isValidatorBanned(validator1));
    }

    function test_UnbanValidator_DoesNotCreateSnapshot() public {
        vm.prank(owner);
        registry.banValidator(validator1);

        uint256 before = registry.getHistoryLength();
        vm.prank(owner);
        registry.unbanValidator(validator1);
        assertEq(registry.getHistoryLength(), before);
    }

    function test_UnbanValidatorAndReactivate() public {
        vm.prank(owner);
        registry.banValidator(validator1);

        vm.prank(validator1);
        vm.expectRevert(abi.encodeWithSignature("CallerBanned()"));
        registry.reactivate();

        vm.prank(owner);
        registry.unbanValidator(validator1);

        vm.prank(validator1);
        registry.reactivate();
        assertTrue((registry.activeValidatorBitmap() & (1 << (1 - 1))) != 0);
    }

    function test_ActiveValidatorBitmap_AfterAddBan() public {
        vm.prank(owner);
        registry.addValidator(validator3);

        uint256 bitmapAfterAdd = registry.activeValidatorBitmap();
        assertEq(bitmapAfterAdd & (1 << (3 - 1)), (1 << (3 - 1)));

        vm.prank(owner);
        registry.banValidator(validator3);

        uint256 bitmapAfterBan = registry.activeValidatorBitmap();
        assertEq(bitmapAfterBan & (1 << (3 - 1)), 0);
    }

    function test_DeactivateAndReactivate() public {
        uint256 beforeHistory = registry.getHistoryLength();

        vm.prank(validator1);
        vm.expectEmit(true, false, false, true);
        emit IPodRegistry.ValidatorDeactivated(validator1);
        registry.deactivate();
        assertEq((registry.activeValidatorBitmap() & (1 << (1 - 1))), 0);
        assertEq(registry.getHistoryLength(), beforeHistory + 1);

        vm.prank(validator1);
        vm.expectEmit(true, false, false, true);
        emit IPodRegistry.ValidatorReactivated(validator1);
        registry.reactivate();
        assertEq((registry.activeValidatorBitmap() & (1 << (1 - 1))), (1 << (1 - 1)));
        assertEq(registry.getHistoryLength(), beforeHistory + 2);
    }

    function test_Deactivate_RevertIfAlreadyInactive() public {
        vm.prank(validator1);
        registry.deactivate();

        vm.prank(validator1);
        vm.expectRevert(abi.encodeWithSignature("CallerAlreadyInactive()"));
        registry.deactivate();
    }

    function test_Reactivate_RevertIfAlreadyActive() public {
        vm.prank(validator1);
        vm.expectRevert(abi.encodeWithSignature("CallerAlreadyActive()"));
        registry.reactivate();
    }

    function test_Reactivate_RevertIfBanned() public {
        vm.prank(owner);
        registry.banValidator(validator1);

        vm.prank(validator1);
        vm.expectRevert(abi.encodeWithSignature("CallerBanned()"));
        registry.reactivate();
    }

    function test_Reactivate_RevertsIfBanned() public {
        vm.prank(owner);
        registry.banValidator(validator1);

        vm.prank(validator1);
        vm.expectRevert(abi.encodeWithSignature("CallerBanned()"));
        registry.reactivate();
    }

    function test_Deactivate_RevertIfNotValidator() public {
        vm.prank(address(1337));
        vm.expectRevert(abi.encodeWithSignature("CallerNotValidator()"));
        registry.deactivate();
    }

    function test_Reactivate_RevertIfNotValidator() public {
        vm.prank(address(1337));
        vm.expectRevert(abi.encodeWithSignature("CallerNotValidator()"));
        registry.reactivate();
    }

    function test_BanValidator_AfterDeactivation() public {
        vm.prank(validator1);
        registry.deactivate();

        vm.prank(owner);
        registry.banValidator(validator1);

        assertEq((registry.activeValidatorBitmap() & (1 << (1 - 1))), 0);
        // index does not change after banning
        assertEq(registry.validatorIndex(validator1), 1);
    }

    function test_SnapshotCreatedOnAddBanDeactivateReactivate() public {
        uint256 initialHistory = registry.getHistoryLength();

        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit IPodRegistry.SnapshotCreated(block.timestamp, (1 << (1 - 1)) | (1 << (2 - 1)) | (1 << (3 - 1)));
        registry.addValidator(validator3);
        assertEq(registry.getHistoryLength(), initialHistory + 1);

        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit IPodRegistry.SnapshotCreated(block.timestamp, (1 << (1 - 1)) | (1 << (2 - 1)));
        registry.banValidator(validator3);
        assertEq(registry.getHistoryLength(), initialHistory + 2);

        vm.prank(validator1);
        vm.expectEmit(true, false, false, true);
        emit IPodRegistry.SnapshotCreated(block.timestamp, (1 << (2 - 1)));
        registry.deactivate();
        assertEq(registry.getHistoryLength(), initialHistory + 3);

        vm.prank(validator1);
        vm.expectEmit(true, false, false, true);
        emit IPodRegistry.SnapshotCreated(block.timestamp, (1 << (1 - 1)) | (1 << (2 - 1)));
        registry.reactivate();
        assertEq(registry.getHistoryLength(), initialHistory + 4);
    }

    function test_ComputeWeight() public view {
        address[] memory subset = new address[](3);
        subset[0] = validator1;
        subset[1] = validator2;
        subset[2] = validator3; // not in registry

        uint256 weight = registry.computeWeight(subset);
        assertEq(weight, 2);
    }

    function test_ComputeWeight_WithDuplicates() public view {
        address[] memory subset = new address[](4);
        subset[0] = validator1;
        subset[1] = validator1; // duplicate
        subset[2] = validator2;
        subset[3] = validator2; // duplicate

        uint256 weight = registry.computeWeight(subset);
        assertEq(weight, 2);
    }

    function test_ComputeWeight_WithSubsetLargerThan255() public view {
        address[] memory subset = new address[](256);
        for (uint16 i = 0; i < 256; i++) {
            subset[i] = validator1;
        }
        uint256 weight = registry.computeWeight(subset);
        assertEq(weight, 1);
    }

    function test_ComputeWeight_IgnoresInactiveValidators() public {
        vm.prank(validator1);
        registry.deactivate();

        address[] memory subset = new address[](2);
        subset[0] = validator1;
        subset[1] = validator2;

        uint256 weight = registry.computeWeight(subset);
        assertEq(weight, 1);
    }

    function test_ComputeWeight_HistoricalAndSnapshotValidation() public {
        vm.prank(owner);
        registry.addValidator(validator3); // snapshot

        vm.warp(block.timestamp + 5);
        vm.prank(owner);
        registry.banValidator(validator1); // another snapshot

        uint256 oldTimestamp = block.timestamp - 3;
        uint256 snapshotIndex = registry.findSnapshotIndex(oldTimestamp);

        address[] memory subset = new address[](3);
        subset[0] = validator1;
        subset[1] = validator2;
        subset[2] = validator3;

        uint256 weight = registry.computeWeight(subset, oldTimestamp, snapshotIndex);
        assertEq(weight, 3);
    }

    function test_ComputeWeight_ExactSnapshotBlock() public {
        vm.prank(owner);
        registry.addValidator(validator3);
        uint256 snapshotIndex = registry.getHistoryLength() - 1;
        uint256 snapshotTimestamp;
        (snapshotTimestamp,) = registry.getSnapshotAtIndex(snapshotIndex);

        address[] memory subset = new address[](3);
        subset[0] = validator1;
        subset[1] = validator2;
        subset[2] = validator3;

        uint256 weight = registry.computeWeight(subset, snapshotTimestamp, snapshotIndex);
        assertEq(weight, 3);
    }

    function test_ComputeWeight_RevertIfSnapshotTooOld() public {
        vm.prank(owner);
        registry.addValidator(validator3); // snapshot at index 1

        vm.prank(owner);
        vm.warp(block.timestamp + 5);
        registry.banValidator(validator1); // snapshot at index 2

        // Use snapshot 0 for current timestamp (too old)
        uint256 latestTimestamp = block.timestamp;

        address[] memory subset = new address[](2);
        subset[0] = validator1;
        subset[1] = validator2;

        vm.expectRevert(abi.encodeWithSignature("SnapshotTooOld()"));
        registry.computeWeight(subset, latestTimestamp, 0);
    }

    function test_ComputeWeight_RevertIfSnapshotTooNew() public {
        vm.prank(owner);
        registry.addValidator(validator3); // snapshot at index 1
        uint256 timestampAtAdd = block.timestamp;
        console.log(timestampAtAdd);

        console.log(timestampAtAdd);
        vm.warp(block.timestamp + 5);
        console.log(timestampAtAdd);
        vm.prank(owner);
        registry.banValidator(validator1); // snapshot at index 2

        // Use snapshot 2 for timestampAtAdd (too new)
        address[] memory subset = new address[](2);
        subset[0] = validator1;
        subset[1] = validator3;

        console.log(timestampAtAdd);
        vm.expectRevert(abi.encodeWithSignature("SnapshotTooNew()"));
        registry.computeWeight(subset, timestampAtAdd, 2);
    }

    function test_ComputeWeight_RevertIfSnapshotIndexOutOfBounds() public {
        address[] memory subset = new address[](1);
        subset[0] = validator1;

        vm.expectRevert(abi.encodeWithSignature("InvalidSnapshotIndex()"));
        registry.computeWeight(subset, block.timestamp, 999);
    }

    function test_ComputeWeight_NoHistoryReturnsZero() public {
        PodRegistry emptyRegistry = new PodRegistry(new address[](0), 0);
        address[] memory subset = new address[](1);
        subset[0] = validator1;
        assertEq(emptyRegistry.computeWeight(subset), 0);
    }

    function test_ComputeWeight_EmptySubsetReturnsZero() public view {
        address[] memory emptySubset = new address[](0);
        uint256 weight = registry.computeWeight(emptySubset);
        assertEq(weight, 0);
    }

    function test_FindSnapshotIndex() public {
        vm.warp(101);
        // Initial snapshot from constructor
        uint256 initialIndex = registry.findSnapshotIndex(block.timestamp);
        assertEq(initialIndex, 0);

        // Warp time and add a new validator (creates snapshot)
        vm.warp(block.timestamp + 5);
        vm.prank(owner);
        registry.addValidator(validator3);
        uint256 timestampAtAdd = block.timestamp;

        // Warp time and ban validator1 (creates another snapshot)
        vm.warp(block.timestamp + 10);
        vm.prank(owner);
        registry.banValidator(validator1);
        uint256 timestampAtBan = block.timestamp;

        // History should now have 3 snapshots:
        // index 0 -> constructor snapshot
        // index 1 -> after adding validator3
        // index 2 -> after banning validator1
        assertEq(registry.getHistoryLength(), 3);

        // Case 1: Timestamp way before first snapshot → index 0
        uint256 indexBeforeFirst = registry.findSnapshotIndex(timestampAtAdd - 100);
        assertEq(indexBeforeFirst, 0);

        // Case 2: Timestamp exactly at first add snapshot → index 1
        uint256 indexAtAdd = registry.findSnapshotIndex(timestampAtAdd);
        assertEq(indexAtAdd, 1);

        // Case 3: Timestamp between add and ban → index 1
        uint256 midTimestamp = timestampAtAdd + 5;
        uint256 indexMid = registry.findSnapshotIndex(midTimestamp);
        assertEq(indexMid, 1);

        // Case 4: Timestamp after last snapshot → index 2
        uint256 indexAfterLast = registry.findSnapshotIndex(block.timestamp + 50);
        assertEq(indexAfterLast, 2);

        // Validate that returned snapshots are correct
        (uint256 timestamp1, uint256 bitmap1) = registry.getSnapshotAtIndex(indexAtAdd);
        assertEq(timestamp1, timestampAtAdd);
        assertTrue(bitmap1 & (1 << (3 - 1)) != 0); // validator3 should be active here

        (uint256 timestamp2, uint256 bitmap2) = registry.getSnapshotAtIndex(indexAfterLast);
        assertEq(timestamp2, timestampAtBan);
        assertTrue(bitmap2 & (1 << (3 - 1)) != 0); // validator3 still active
        assertFalse(bitmap2 & (1 << (1 - 1)) != 0); // validator1 banned
    }

    function test_FindSnapshotIndex_BeforeFirstSnapshot() public {
        vm.warp(101);
        uint256 index = registry.findSnapshotIndex(block.timestamp - 100); // way before
        assertEq(index, 0);
    }

    function test_FindSnapshotIndex_AfterLastSnapshot() public {
        vm.prank(owner);
        registry.addValidator(validator3);

        vm.warp(block.timestamp + 10);
        vm.prank(owner);
        registry.banValidator(validator1);

        uint256 index = registry.findSnapshotIndex(block.timestamp + 50); // after last
        assertEq(index, registry.getHistoryLength() - 1);
    }

    function test_FindSnapshotIndex_SingleSnapshot() public view {
        uint256 index = registry.findSnapshotIndex(block.timestamp);
        assertEq(index, 0);
    }

    function test_FindSnapshotIndex_ExactMatchLastSnapshot() public {
        vm.warp(block.timestamp + 10);
        vm.prank(owner);
        registry.addValidator(validator3);
        uint256 latestSnapshotTimestamp = block.timestamp;
        uint256 index = registry.findSnapshotIndex(latestSnapshotTimestamp);
        assertEq(index, registry.getHistoryLength() - 1);
    }

    function test_GetSnapshot() public {
        vm.prank(owner);
        registry.addValidator(validator3);
        uint256 index = registry.getHistoryLength() - 1;
        (uint256 timestamp, uint256 bitmap) = registry.getSnapshotAtIndex(index);
        assertGt(timestamp, 0);
        assertTrue(bitmap & (1 << (3 - 1)) != 0);
    }

    function test_GetHistory() public {
        uint256 before = registry.getHistoryLength();
        vm.prank(owner);
        registry.addValidator(validator3);
        assertEq(registry.getHistoryLength(), before + 1);
    }

    function test_GetActiveValidators() public view {
        address[] memory validators = registry.getActiveValidators();
        assertEq(validators.length, 2);
        assertEq(validators[0], validator1);
        assertEq(validators[1], validator2);
    }

    function test_GetValidatorsAtIndex() public {
        vm.startPrank(owner);
        vm.warp(100);
        registry.addValidator(validator3);
        registry.banValidator(validator1);
        vm.warp(block.timestamp + 100);
        registry.addValidator(validator4);
        vm.stopPrank();
        uint256 index = registry.findSnapshotIndex(100);
        address[] memory validators = registry.getValidatorsAtIndex(index);
        assertEq(validators.length, 2);
        assertEq(validators[0], validator2);
        assertEq(validators[1], validator3);
    }
}
