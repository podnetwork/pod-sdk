pragma solidity ^0.8.25;

import {Test} from "forge-std/Test.sol";
import "../src/CDNToWalrusRegistry.sol";
import {console} from "@forge/console.sol";

contract CDNToWalrusRegistryTest is Test {
    CDNToWalrusRegistry registry;
    address owner = address(0x1);
    address nonOwner = address(0x2);
    
    // The specific IDs provided
    bytes32 constant WALRUS_ID = 0x503d77961eb14a308a9b87d92c7898c19937cd267b3d9ded18df194a6d7f56fc; // base64url decode of "Pz3wmmi6F1KMmrN9QcGR_fnqyg4cupFI-nS-WSW2d1c"
    bytes32 constant CDN_ID = 0xf5c2099e69ee4bdc4e9b87d92c7898c19937cd267b3d9ded18df194a6d7f56fc;
    
    // Define the event signature for testing
    event CDNWalrusRecordCreated(bytes32 indexed cdnId, bytes32 indexed walrusId);
    
    function setUp() public {
        vm.startPrank(owner);
        registry = new CDNToWalrusRegistry();
        vm.stopPrank();
    }

    function testConstructor() public {
        assertEq(registry.owner(), owner, "Owner should be set to the deployer");
    }

    function testSetRecord() public {
        vm.startPrank(owner);
        registry.setRecord(CDN_ID, WALRUS_ID);
        vm.stopPrank();
        
        assertEq(registry.getWalrusIdByCdnId(CDN_ID), WALRUS_ID, "CDN ID should map to Walrus ID");
        assertEq(registry.getCdnIdByWalrusId(WALRUS_ID), CDN_ID, "Walrus ID should map to CDN ID");
    }
    
    function testSetRecordEmitsEvent() public {
        vm.startPrank(owner);
        
        vm.expectEmit(true, true, false, true);
        emit CDNWalrusRecordCreated(CDN_ID, WALRUS_ID);
        registry.setRecord(CDN_ID, WALRUS_ID);
        
        vm.stopPrank();
    }
    
    function testSetRecordFailsForNonOwner() public {
        vm.startPrank(nonOwner);

        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, nonOwner));
        registry.setRecord(CDN_ID, WALRUS_ID);

        console.logBytes32(CDN_ID);
        console.logBytes32(WALRUS_ID);
        
        vm.stopPrank();
    }
    
    function testGetters() public {
        vm.startPrank(owner);
        registry.setRecord(CDN_ID, WALRUS_ID);
        vm.stopPrank();
        
        assertEq(registry.getWalrusIdByCdnId(CDN_ID), WALRUS_ID, "getWalrusIdByCdnId should return correct Walrus ID");
        assertEq(registry.getCdnIdByWalrusId(WALRUS_ID), CDN_ID, "getCdnIdByWalrusId should return correct CDN ID");
    }
    
    function testTransferOwnership() public {
        vm.startPrank(owner);
        registry.transferOwnership(nonOwner);
        vm.stopPrank();
        
        assertEq(registry.owner(), nonOwner, "Ownership should be transferred to nonOwner");
        
        // Now nonOwner should be able to add records
        vm.startPrank(nonOwner);
        registry.setRecord(CDN_ID, WALRUS_ID);
        vm.stopPrank();
        
        assertEq(registry.getWalrusIdByCdnId(CDN_ID), WALRUS_ID, "New owner should be able to add records");
    }
    
    function testTransferOwnershipFailsForNonOwner() public {
        vm.startPrank(nonOwner);
        
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, nonOwner));
        registry.transferOwnership(nonOwner);
        
        vm.stopPrank();
    }
    
    function testMultipleRecords() public {
        bytes32 cdnId1 = keccak256("cdn1");
        bytes32 walrusId1 = keccak256("walrus1");
        bytes32 cdnId2 = keccak256("cdn2");
        bytes32 walrusId2 = keccak256("walrus2");
        
        vm.startPrank(owner);
        
        registry.setRecord(cdnId1, walrusId1);
        registry.setRecord(cdnId2, walrusId2);
        
        vm.stopPrank();
        
        assertEq(registry.getWalrusIdByCdnId(cdnId1), walrusId1, "First record should be correct");
        assertEq(registry.getCdnIdByWalrusId(walrusId1), cdnId1, "First record inverse should be correct");
        
        assertEq(registry.getWalrusIdByCdnId(cdnId2), walrusId2, "Second record should be correct");
        assertEq(registry.getCdnIdByWalrusId(walrusId2), cdnId2, "Second record inverse should be correct");
    }
    
    function testOverwriteRecord() public {
        bytes32 cdnId = keccak256("cdn");
        bytes32 walrusId1 = keccak256("walrus1");
        bytes32 walrusId2 = keccak256("walrus2");
        
        vm.startPrank(owner);
        
        // Add initial mapping
        registry.setRecord(cdnId, walrusId1);
        assertEq(registry.getWalrusIdByCdnId(cdnId), walrusId1, "Initial record should be set");
        
        // Overwrite with new mapping
        registry.setRecord(cdnId, walrusId2);
        assertEq(registry.getWalrusIdByCdnId(cdnId), walrusId2, "Record should be overwritten");
        
        vm.stopPrank();
    }
}