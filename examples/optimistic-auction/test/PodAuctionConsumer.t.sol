// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {PodTest} from "pod-sdk/test/podTest.sol";
import {PodECDSA, ECDSA} from "pod-sdk/verifier/PodECDSA.sol";
import {MerkleTree} from "pod-sdk/verifier/MerkleTree.sol";
import {PodRegistry} from "pod-sdk/verifier/PodRegistry.sol";
import {PodAuctionConsumer} from "../contracts/PodAuctionConsumer.sol";
import {Time} from "pod-sdk/Time.sol";

contract PodAuctionConsumerTest is PodTest {
    using Time for Time.Timestamp;

    PodAuctionConsumer consumer;
    PodRegistry podRegistry;

    uint256[] validatorPrivateKeys;

    address constant OWNER = address(0x123abc);
    uint256 constant AUCTION_ID = 1;
    uint64 constant DEADLINE = 3485693721;
    address constant SMALLER_BIDDER = 0x13791790Bef192d14712D627f13A55c4ABEe52a4;
    address constant HIGHER_BIDDER = 0xb8AA43999C2b3Cbb10FbE2092432f98D8F35Dcd7;
    address constant BONDED_ADDRESS = address(0x123def);
    uint64 constant U = 10 minutes * Time.MICROSECONDS_PER_SECOND;
    uint256 constant NUMBER_OF_VALIDATORS = 128;
    uint256 constant F = NUMBER_OF_VALIDATORS / 3;

    function setUp() public {
        vm.prank(OWNER);
        podRegistry = new PodRegistry(new address[](0));

        validatorPrivateKeys = new uint256[](NUMBER_OF_VALIDATORS);

        for (uint256 i = 0; i < NUMBER_OF_VALIDATORS; i++) {
            validatorPrivateKeys[i] = uint256(i + 1);
            vm.prank(OWNER);
            podRegistry.addValidator(vm.addr(validatorPrivateKeys[i]));
        }

        consumer = new PodAuctionConsumer(address(podRegistry), 1 ether);
        vm.deal(SMALLER_BIDDER, 2 ether);
        vm.deal(HIGHER_BIDDER, 2 ether);
        vm.deal(BONDED_ADDRESS, 2 ether);
        vm.prank(SMALLER_BIDDER);
        consumer.bond{value: 1 ether}();
        vm.prank(HIGHER_BIDDER);
        consumer.bond{value: 1 ether}();
        vm.prank(BONDED_ADDRESS);
        consumer.bond{value: 1 ether}();

        podWarp(Time.fromMicros(DEADLINE));
        podMockQuorum();
    }

    function tearDown() public {
        vm.clearMockedCalls();
    }

    function test_Write_Success() public {
        PodECDSA.CertifiedLog memory certifiedLog = createCertifiedLog(2 * F + 1, true);

        vm.prank(SMALLER_BIDDER);
        consumer.write(certifiedLog);

        podWarp(Time.currentTime().addMicros(2 * U));

        PodAuctionConsumer.State memory state = consumer.read(AUCTION_ID, Time.fromMicros(DEADLINE));
        assertEq(state.winner.bid, 100);
        assertEq(state.winner.bidder, SMALLER_BIDDER);
    }

    function test_Write_Fail_BidderNotBonded() public {
        vm.prank(makeAddr("not_bonded"));
        PodECDSA.CertifiedLog memory certifiedLog = createCertifiedLog(2 * F + 1, true);
        vm.expectRevert("Not bonded");
        consumer.write(certifiedLog);
    }

    function test_Write_Fail_BidderNotWriter() public {
        PodECDSA.CertifiedLog memory certifiedLog = createCertifiedLog(2 * F + 1, true);

        vm.prank(BONDED_ADDRESS);
        vm.expectRevert("Invalid caller");
        consumer.write(certifiedLog);
    }

    function test_Write_Fail_BidAlreadyWritten() public {
        PodECDSA.CertifiedLog memory certifiedLogSmallerBid = createCertifiedLog(2 * F + 1, true);

        vm.prank(SMALLER_BIDDER);
        consumer.write(certifiedLogSmallerBid);

        PodECDSA.CertifiedLog memory certifiedLogHigherBid = createCertifiedLog(2 * F + 1, false);

        vm.prank(HIGHER_BIDDER);
        vm.expectRevert("Bid already exists");
        consumer.write(certifiedLogHigherBid);
    }

    function test_Write_Fail_WritingPeriodEnded() public {
        PodECDSA.CertifiedLog memory certifiedLog = createCertifiedLog(2 * F + 1, true);

        podWarp(Time.currentTime().addMicros(U + 1 seconds * Time.MICROSECONDS_PER_SECOND));

        vm.prank(SMALLER_BIDDER);
        vm.expectRevert("Writing period ended");
        consumer.write(certifiedLog);
    }

    function test_Write_Fail_InvalidCommittee() public {
        PodECDSA.CertifiedLog memory certifiedLog = createCertifiedLog(2 * F, true);
        vm.expectRevert("Invalid proof or quorum not reached");
        vm.prank(SMALLER_BIDDER);
        consumer.write(certifiedLog);
    }

    function test_BlameIllAnnounced_Success() public {
        PodECDSA.CertifiedLog memory certifiedLogSmallerBid = createCertifiedLog(2 * F + 1, true);

        vm.prank(SMALLER_BIDDER);
        consumer.write(certifiedLogSmallerBid);

        PodECDSA.CertifiedLog memory certifiedLogHigherBid = createCertifiedLog(2 * F + 1, false);

        assert(consumer.isBonded(SMALLER_BIDDER));

        vm.prank(HIGHER_BIDDER);
        consumer.blameIllAnnounced(certifiedLogHigherBid);
        podWarp(Time.currentTime().addMicros(2 * U));

        PodAuctionConsumer.State memory state = consumer.read(AUCTION_ID, Time.fromMicros(DEADLINE));
        assertEq(state.winner.bid, 1000);
        assertEq(state.winner.bidder, HIGHER_BIDDER);
        assertEq(state.blamed.bid, 100);
        assertEq(state.blamed.bidder, SMALLER_BIDDER);
        assert(!consumer.isBonded(SMALLER_BIDDER));
    }

    function test_BlameIllAnnounced_Fail_BidNotWritten() public {
        PodECDSA.CertifiedLog memory certifiedLog = createCertifiedLog(2 * F + 1, true);

        vm.prank(BONDED_ADDRESS);
        vm.expectRevert("Bid not written");
        consumer.blameIllAnnounced(certifiedLog);
    }

    function test_BlameIllAnnounced_Fail_DisputePeriodEnded() public {
        PodECDSA.CertifiedLog memory certifiedLogSmallerBid = createCertifiedLog(2 * F + 1, true);

        vm.prank(SMALLER_BIDDER);
        consumer.write(certifiedLogSmallerBid);

        podWarp(Time.currentTime().addMicros(2 * U));

        PodECDSA.CertifiedLog memory certifiedLogHigherBid = createCertifiedLog(2 * F + 1, false);

        vm.prank(BONDED_ADDRESS);
        vm.expectRevert("Dispute period ended");
        consumer.blameIllAnnounced(certifiedLogHigherBid);
    }

    function test_BlameIllAnnounced_Fail_InvalidCommittee() public {
        PodECDSA.CertifiedLog memory certifiedLog = createCertifiedLog(2 * F + 1, true);

        vm.prank(SMALLER_BIDDER);
        consumer.write(certifiedLog);

        PodECDSA.CertifiedLog memory certifiedLogHigherBid = createCertifiedLog(2 * F, false);

        vm.prank(BONDED_ADDRESS);
        vm.expectRevert("Invalid proof or quorum not reached");
        consumer.blameIllAnnounced(certifiedLogHigherBid);
    }

    function test_BlameNoShow_Success() public {
        PodECDSA.CertifiedLog memory certifiedLogSmallerBid = createCertifiedLog(2 * F + 1, true);

        PodECDSA.CertifiedLog memory certifiedLogHigherBid = createCertifiedLog(F + 1, false);

        podWarp(Time.currentTime().addMicros(U));

        assert(consumer.isBonded(SMALLER_BIDDER));

        vm.prank(BONDED_ADDRESS);
        consumer.blameNoShow(certifiedLogSmallerBid);
        vm.prank(BONDED_ADDRESS);
        consumer.blameNoShow(certifiedLogHigherBid);

        podWarp(Time.currentTime().addMicros(2 * U));

        PodAuctionConsumer.State memory state = consumer.read(AUCTION_ID, Time.fromMicros(DEADLINE));
        assertEq(state.winner.bid, 0);
        assertEq(state.winner.bidder, address(0));
        assertEq(state.blamed.bid, 1000);
        assertEq(state.blamed.bidder, HIGHER_BIDDER);
        assert(!consumer.isBonded(HIGHER_BIDDER));
    }

    function test_BlameNoShow_Fail_InvalidCommittee() public {
        PodECDSA.CertifiedLog memory certifiedLog = createCertifiedLog(F, true);

        podWarp(Time.currentTime().addMicros(U));

        vm.prank(BONDED_ADDRESS);
        vm.expectRevert("Invalid proof or quorum not reached");
        consumer.blameNoShow(certifiedLog);
    }

    function test_BlameNoShow_Fail_BidAlreadyExists() public {
        PodECDSA.CertifiedLog memory certifiedLogSmallerBid = createCertifiedLog(2 * F + 1, true);

        vm.prank(SMALLER_BIDDER);
        consumer.write(certifiedLogSmallerBid);

        podWarp(Time.currentTime().addMicros(U));

        PodECDSA.CertifiedLog memory certifiedLogHigherBid = createCertifiedLog(F + 1, false);

        vm.prank(BONDED_ADDRESS);
        vm.expectRevert("Bid already exists");
        consumer.blameNoShow(certifiedLogHigherBid);
    }

    function test_BlameNoShow_Fail_DisputePeriodEnded() public {
        podWarp(Time.currentTime().addMicros(2 * U));

        PodECDSA.CertifiedLog memory certifiedLogHigherBid = createCertifiedLog(F + 1, false);

        podWarp(Time.currentTime().addMicros(2 * U));

        vm.prank(BONDED_ADDRESS);
        vm.expectRevert("Dispute period ended");
        consumer.blameNoShow(certifiedLogHigherBid);
    }

    function test_BlameNoShow_Fail_StillInWaitingPeriod() public {
        PodECDSA.CertifiedLog memory certifiedLog = createCertifiedLog(F + 1, false);

        vm.prank(BONDED_ADDRESS);
        vm.expectRevert("Still in waiting period");
        consumer.blameNoShow(certifiedLog);
    }

    function test_BlameNoShow_Fail_InvalidBid() public {
        PodECDSA.CertifiedLog memory certifiedLogHigherBid = createCertifiedLog(F + 1, false);

        PodECDSA.CertifiedLog memory certifiedLogSmallerBid = createCertifiedLog(F + 1, true);

        podWarp(Time.currentTime().addMicros(U));

        vm.prank(BONDED_ADDRESS);
        consumer.blameNoShow(certifiedLogHigherBid);

        vm.prank(BONDED_ADDRESS);
        vm.expectRevert("Invalid blamed bid");
        consumer.blameNoShow(certifiedLogSmallerBid);
    }

    function createCertifiedLog(uint256 numberOfRequiredSignatures, bool isSmallerBid)
        internal
        view
        returns (PodECDSA.CertifiedLog memory)
    {
        (bytes32 receiptRoot, bytes32[] memory topics, bytes memory data, bytes32[] memory merklePath) = (
            getReceiptRoot(isSmallerBid ? 0 : 1),
            getTopicsForBid(isSmallerBid ? 0 : 1),
            getDataForBid(isSmallerBid ? 0 : 1),
            getMerklePathForBid(isSmallerBid ? 0 : 1)
        );

        bytes[] memory signatures = new bytes[](numberOfRequiredSignatures);
        for (uint256 i = 0; i < numberOfRequiredSignatures; i++) {
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(validatorPrivateKeys[i], receiptRoot);
            signatures[i] = ECDSA._serialize_signature(v, r, s);
        }

        bytes memory aggregateSignature = ECDSA.aggregate_signatures(signatures);

        PodECDSA.CertifiedReceipt memory certifiedReceipt =
            PodECDSA.CertifiedReceipt({receiptRoot: receiptRoot, aggregateSignature: aggregateSignature});

        PodECDSA.Log memory log =
            PodECDSA.Log({addr: 0x217F5658c6ecC27D439922263AD9Bb8e992e0373, topics: topics, data: data});

        bytes32 logHash = PodECDSA.hashLog(log);
        bytes32 leaf = MerkleTree.hashLeaf(bytes("log_hashes[0]"), logHash);
        MerkleTree.Proof memory proof = MerkleTree.Proof({path: merklePath});

        PodECDSA.CertifiedLog memory certifiedLog = PodECDSA.CertifiedLog({
            log: log,
            logIndex: 0,
            certificate: PodECDSA.Certificate({leaf: leaf, certifiedReceipt: certifiedReceipt, proof: proof})
        });

        return certifiedLog;
    }

    function getReceiptRoot(uint256 index) public pure returns (bytes32) {
        bytes32[] memory receiptRoots = new bytes32[](2);
        receiptRoots[0] = bytes32(0x7a7de453df4c8bc30bec5eb5948e6c7d9bfa4c625ca72835c6f847f0b2adef74);
        receiptRoots[1] = bytes32(0xff1f0769c1f5f49d15679c58beffaa9c63627314c2965a2c3025b6012a6a93ab);

        return receiptRoots[index];
    }

    function getDataForBid(uint256 index) public pure returns (bytes memory) {
        bytes[] memory data = new bytes[](2);
        data[0] = hex"0000000000000000000000000000000000000000000000000000000000000064";
        data[1] = hex"00000000000000000000000000000000000000000000000000000000000003e8";

        return data[index];
    }

    function getTopicsForBid(uint256 index) public pure returns (bytes32[] memory) {
        bytes32[][] memory topics = new bytes32[][](2);
        topics[0] = new bytes32[](4);
        topics[1] = new bytes32[](4);
        topics[0][0] = 0xaf2c4fdca8563d13e2f56ed3c7b48d3f86c61b037e7281617071a41d281a2204;
        topics[0][1] = 0x0000000000000000000000000000000000000000000000000000000000000001;
        topics[0][2] = 0x00000000000000000000000013791790bef192d14712d627f13a55c4abee52a4;
        topics[0][3] = 0x00000000000000000000000000000000000000000000000000000000cfc37719;

        topics[1][0] = 0xaf2c4fdca8563d13e2f56ed3c7b48d3f86c61b037e7281617071a41d281a2204;
        topics[1][1] = 0x0000000000000000000000000000000000000000000000000000000000000001;
        topics[1][2] = 0x000000000000000000000000b8aa43999c2b3cbb10fbe2092432f98d8f35dcd7;
        topics[1][3] = 0x00000000000000000000000000000000000000000000000000000000cfc37719;

        return topics[index];
    }

    function getMerklePathForBid(uint256 index) public pure returns (bytes32[] memory) {
        bytes32[][] memory paths = new bytes32[][](2);
        paths[0] = new bytes32[](5);
        paths[1] = new bytes32[](4);
        paths[0][0] = 0x0177fef4eb615dc3b054c47369eb6c0c0a3e63740da7cf01a1533b59fa7df56a;
        paths[0][1] = 0xd9c74aa19994428cc9b9f72b363dfd58a156391e783e8cb1eebc64ff6387eb15;
        paths[0][2] = 0x556284c9263c29665d5873357d4c33187f44f4fc2ce249d2d1c3863e6c2524a8;
        paths[0][3] = 0xb20da9eaaf8eed5af276144f72c4e994d77d10d7305d40f2b50ea6a59fe1af39;
        paths[0][4] = 0x991d66b8fba006fde490a120dcfd3d32ad74069d63a55a020dff94577f15e370;

        paths[1][0] = 0xa826946064ba2696b1fec95e71239f315349b6b918d84119719797d3e1a2a5c6;
        paths[1][1] = 0x806b5fec59ccb4b45a849aa355770e3235798253b5e4d95c0317b4b3bcd8de9b;
        paths[1][2] = 0x1e4c1fbcb3c12597e0abeae10285c243fd477b094efd8e3a8c1e4aa4eebc164c;
        paths[1][3] = 0xd956ed9b6b393a9e5079d484e41e61d7394bf8020d6ed2df9a9e2dc775bd14b8;

        return paths[index];
    }
}
