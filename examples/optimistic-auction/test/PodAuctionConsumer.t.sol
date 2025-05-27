// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";

import {PodECDSA, ECDSA} from "pod-sdk/verifier/PodECDSA.sol";
import {MerkleTree} from "pod-sdk/verifier/MerkleTree.sol";
import {PodRegistry} from "pod-sdk/verifier/PodRegistry.sol";

import {PodAuctionConsumer} from "../contracts/PodAuctionConsumer.sol";

contract PodAuctionConsumerTest is Test {
    PodAuctionConsumer consumer;
    PodRegistry podRegistry;

    uint256[] validatorPrivateKeys;

    address constant OWNER = address(0x123abc);
    uint256 constant AUCTION_ID = 1;
    uint256 constant DEADLINE = 3485693721;
    address constant SMALLER_BIDDER = 0x13791790Bef192d14712D627f13A55c4ABEe52a4;
    address constant HIGHER_BIDDER = 0xb8AA43999C2b3Cbb10FbE2092432f98D8F35Dcd7;
    address constant BONDED_ADDRESS = address(0x123def);
    uint256 constant U = 10 minutes;
    uint256 constant NUMBER_OF_VALIDATORS = 128;
    uint256 constant F = NUMBER_OF_VALIDATORS / 3;

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
        receiptRoots[0] = bytes32(0xfb653dbc9be0456daa371448ef33dc1e0f62d0a6d356a1040d666e352f0ac814);
        receiptRoots[1] = bytes32(0x1fd355504a7c4cbb2fc6d3259e2eb144f26067cf81f77c92816dbd7b21ee3a33);

        return receiptRoots[index];
    }

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

        vm.warp(DEADLINE);
    }

    function test_Write_Success() public {
        PodECDSA.CertifiedLog memory certifiedLog = createCertifiedLog(2 * F + 1, true);

        vm.prank(SMALLER_BIDDER);
        consumer.write(certifiedLog);

        vm.warp(block.timestamp + 2 * U);
        PodAuctionConsumer.State memory state = consumer.read(AUCTION_ID, DEADLINE);
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

        vm.warp(block.timestamp + U + 1 seconds);
        vm.expectRevert("Writing period ended");
        vm.prank(SMALLER_BIDDER);
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
        vm.warp(block.timestamp + 2 * U);
        PodAuctionConsumer.State memory state = consumer.read(AUCTION_ID, DEADLINE);
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

        vm.warp(block.timestamp + 2 * U);

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

        vm.warp(block.timestamp + U);

        assert(consumer.isBonded(SMALLER_BIDDER));

        vm.prank(BONDED_ADDRESS);
        consumer.blameNoShow(certifiedLogSmallerBid);
        vm.prank(BONDED_ADDRESS);
        consumer.blameNoShow(certifiedLogHigherBid);

        vm.warp(block.timestamp + U);
        PodAuctionConsumer.State memory state = consumer.read(AUCTION_ID, DEADLINE);
        assertEq(state.winner.bid, 0);
        assertEq(state.winner.bidder, address(0));
        assertEq(state.blamed.bid, 1000);
        assertEq(state.blamed.bidder, HIGHER_BIDDER);
        assert(!consumer.isBonded(HIGHER_BIDDER));
    }

    function test_BlameNoShow_Fail_InvalidCommittee() public {
        PodECDSA.CertifiedLog memory certifiedLog = createCertifiedLog(F, true);

        vm.warp(block.timestamp + U);

        vm.prank(BONDED_ADDRESS);
        vm.expectRevert("Invalid proof or quorum not reached");
        consumer.blameNoShow(certifiedLog);
    }

    function test_BlameNoShow_Fail_BidAlreadyExists() public {
        PodECDSA.CertifiedLog memory certifiedLogSmallerBid = createCertifiedLog(2 * F + 1, true);

        vm.prank(SMALLER_BIDDER);
        consumer.write(certifiedLogSmallerBid);

        vm.warp(block.timestamp + U);

        PodECDSA.CertifiedLog memory certifiedLogHigherBid = createCertifiedLog(F + 1, false);

        vm.prank(BONDED_ADDRESS);
        vm.expectRevert("Bid already exists");
        consumer.blameNoShow(certifiedLogHigherBid);
    }

    function test_BlameNoShow_Fail_DisputePeriodEnded() public {
        vm.warp(block.timestamp + 2 * U);

        PodECDSA.CertifiedLog memory certifiedLogHigherBid = createCertifiedLog(F + 1, false);

        vm.warp(block.timestamp + 2 * U);

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

        vm.warp(block.timestamp + U);

        vm.prank(BONDED_ADDRESS);
        consumer.blameNoShow(certifiedLogHigherBid);

        vm.prank(BONDED_ADDRESS);
        vm.expectRevert("Invalid blamed bid");
        consumer.blameNoShow(certifiedLogSmallerBid);
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
        topics[0][0] = 0x71a5674c44b823bc0df08201dfeb2e8bdf698cd684fd2bbaa79adcf2c99fc186;
        topics[0][1] = 0x0000000000000000000000000000000000000000000000000000000000000001;
        topics[0][2] = 0x00000000000000000000000013791790bef192d14712d627f13a55c4abee52a4;
        topics[0][3] = 0x00000000000000000000000000000000000000000000000000000000cfc37719;

        topics[1][0] = 0x71a5674c44b823bc0df08201dfeb2e8bdf698cd684fd2bbaa79adcf2c99fc186;
        topics[1][1] = 0x0000000000000000000000000000000000000000000000000000000000000001;
        topics[1][2] = 0x000000000000000000000000b8aa43999c2b3cbb10fbe2092432f98d8f35dcd7;
        topics[1][3] = 0x00000000000000000000000000000000000000000000000000000000cfc37719;

        return topics[index];
    }

    function getMerklePathForBid(uint256 index) public pure returns (bytes32[] memory) {
        bytes32[][] memory paths = new bytes32[][](2);
        paths[0] = new bytes32[](4);
        paths[1] = new bytes32[](4);
        paths[0][0] = 0xa2e1598bfba340380f9c4afd604bb90aa52177f20265fc51a545ed7afa8340c5;
        paths[0][1] = 0xe379a641c974751f9a3a1f669375ad1afc98312bdc736c2b569bf8456e83912f;
        paths[0][2] = 0x0661d69b9f70d66cb53973889fa688813f383dd3aacb414284c5fb7af87e3bdf;
        paths[0][3] = 0x2347a5f5ee6e8143ad9c36ae4b18468af22887fd6e0461168123043fdd9f1451;

        paths[1][0] = 0xce79bd76031060b0998ee519056b313b6c72fb46e0b6ecbd1b2ada11b704a891;
        paths[1][1] = 0xb619207d866dd4f3a963342beb2f3b27e1e9236f9ef5779a64e3423689a999b4;
        paths[1][2] = 0x7840802a561656ee525f26d5558d5321064b82ad939a3a2e7f6c4b0fecd8f58c;
        paths[1][3] = 0xd565b44d7287e02590e6fbe7addb4bf6d612f46b45683d2010eecf4dca0f4b5f;

        return paths[index];
    }
}
