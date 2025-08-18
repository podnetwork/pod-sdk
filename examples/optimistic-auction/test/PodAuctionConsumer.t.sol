// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {PodECDSA, ECDSA} from "pod-sdk/verifier/PodECDSA.sol";
import {MerkleTree} from "pod-sdk/verifier/MerkleTree.sol";
import {PodRegistry} from "pod-sdk/verifier/PodRegistry.sol";
import {PodAuctionConsumer} from "../contracts/PodAuctionConsumer.sol";
import {console} from "forge-std/console.sol";
import {Math} from "openzeppelin-contracts/utils/math/Math.sol";

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
    uint256 constant NUMBER_OF_VALIDATORS = 128;

    function getRequiredSigs(uint256 thresholdNumerator, uint256 thresholdDenominator, Math.Rounding rounding)
        internal
        pure
        returns (uint256)
    {
        return Math.mulDiv(thresholdNumerator, NUMBER_OF_VALIDATORS, thresholdDenominator, rounding);
    }

    function setUp() public {
        address[] memory initialValidators = new address[](NUMBER_OF_VALIDATORS);

        validatorPrivateKeys = new uint256[](NUMBER_OF_VALIDATORS);

        for (uint256 i = 0; i < NUMBER_OF_VALIDATORS; i++) {
            validatorPrivateKeys[i] = uint256(i + 1);
            initialValidators[i] = vm.addr(validatorPrivateKeys[i]);
        }

        vm.prank(OWNER);
        podRegistry = new PodRegistry(initialValidators);

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
        uint256 requiredSigs = getRequiredSigs(2, 3, Math.Rounding.Ceil);
        PodECDSA.CertifiedLog memory certifiedLog = createCertifiedLog(requiredSigs, true);

        vm.prank(SMALLER_BIDDER);
        consumer.write(certifiedLog);

        vm.warp(block.timestamp + consumer.TWO_TIMES_DISPUTE_PERIOD());
        PodAuctionConsumer.State memory state = consumer.read(AUCTION_ID, DEADLINE);

        assertEq(state.winner.bid, 100);
        assertEq(state.winner.bidder, SMALLER_BIDDER);
    }

    function test_Write_Fail_BidderNotBonded() public {
        vm.prank(makeAddr("not_bonded"));
        uint256 requiredSigs = getRequiredSigs(2, 3, Math.Rounding.Ceil);
        PodECDSA.CertifiedLog memory certifiedLog = createCertifiedLog(requiredSigs, true);
        vm.expectRevert("Not bonded");
        consumer.write(certifiedLog);
    }

    function test_Write_Fail_BidderNotWriter() public {
        uint256 requiredSigs = getRequiredSigs(2, 3, Math.Rounding.Ceil);
        PodECDSA.CertifiedLog memory certifiedLog = createCertifiedLog(requiredSigs, true);

        vm.prank(BONDED_ADDRESS);
        vm.expectRevert("Invalid caller");
        consumer.write(certifiedLog);
    }

    function test_Write_Fail_BidAlreadyWritten() public {
        uint256 requiredSigs = getRequiredSigs(2, 3, Math.Rounding.Ceil);
        PodECDSA.CertifiedLog memory certifiedLogSmallerBid = createCertifiedLog(requiredSigs, true);

        vm.prank(SMALLER_BIDDER);
        consumer.write(certifiedLogSmallerBid);

        requiredSigs = getRequiredSigs(2, 3, Math.Rounding.Ceil);
        PodECDSA.CertifiedLog memory certifiedLogHigherBid = createCertifiedLog(requiredSigs, false);

        vm.prank(HIGHER_BIDDER);
        vm.expectRevert("Bid already exists");
        consumer.write(certifiedLogHigherBid);
    }

    function test_Write_Fail_WritingPeriodEnded() public {
        uint256 requiredSigs = getRequiredSigs(2, 3, Math.Rounding.Ceil);
        PodECDSA.CertifiedLog memory certifiedLog = createCertifiedLog(requiredSigs, true);

        vm.warp(block.timestamp + consumer.DISPUTE_PERIOD() + 1 seconds);

        vm.prank(SMALLER_BIDDER);
        vm.expectRevert("Writing period ended");
        consumer.write(certifiedLog);
    }

    function test_Write_Fail_InvalidCommittee() public {
        uint256 requiredSigs = getRequiredSigs(2, 3, Math.Rounding.Floor);
        console.log("requiredSigs", requiredSigs);
        PodECDSA.CertifiedLog memory certifiedLog = createCertifiedLog(requiredSigs, true);
        vm.expectRevert("Invalid proof or quorum not reached");
        vm.prank(SMALLER_BIDDER);
        consumer.write(certifiedLog);
    }

    function test_BlameIllAnnounced_Success() public {
        uint256 requiredSigs = getRequiredSigs(2, 3, Math.Rounding.Ceil);
        PodECDSA.CertifiedLog memory certifiedLogSmallerBid = createCertifiedLog(requiredSigs, true);

        vm.prank(SMALLER_BIDDER);
        consumer.write(certifiedLogSmallerBid);

        requiredSigs = getRequiredSigs(2, 3, Math.Rounding.Ceil);
        PodECDSA.CertifiedLog memory certifiedLogHigherBid = createCertifiedLog(requiredSigs, false);

        assert(consumer.isBonded(SMALLER_BIDDER));

        vm.prank(HIGHER_BIDDER);
        consumer.blameIllAnnounced(certifiedLogHigherBid);
        vm.warp(block.timestamp + consumer.TWO_TIMES_DISPUTE_PERIOD());
        PodAuctionConsumer.State memory state = consumer.read(AUCTION_ID, DEADLINE);
        assertEq(state.winner.bid, 1000);
        assertEq(state.winner.bidder, HIGHER_BIDDER);
        assertEq(state.blamed.bid, 100);
        assertEq(state.blamed.bidder, SMALLER_BIDDER);
        assert(!consumer.isBonded(SMALLER_BIDDER));
    }

    function test_BlameIllAnnounced_Fail_BidNotWritten() public {
        uint256 requiredSigs = getRequiredSigs(2, 3, Math.Rounding.Ceil);
        PodECDSA.CertifiedLog memory certifiedLog = createCertifiedLog(requiredSigs, true);

        vm.prank(BONDED_ADDRESS);
        vm.expectRevert("Bid not written");
        consumer.blameIllAnnounced(certifiedLog);
    }

    function test_BlameIllAnnounced_Fail_DisputePeriodEnded() public {
        uint256 requiredSigs = getRequiredSigs(2, 3, Math.Rounding.Ceil);
        PodECDSA.CertifiedLog memory certifiedLogSmallerBid = createCertifiedLog(requiredSigs, true);

        vm.prank(SMALLER_BIDDER);
        consumer.write(certifiedLogSmallerBid);

        vm.warp(block.timestamp + consumer.TWO_TIMES_DISPUTE_PERIOD());

        requiredSigs = getRequiredSigs(2, 3, Math.Rounding.Ceil);
        PodECDSA.CertifiedLog memory certifiedLogHigherBid = createCertifiedLog(requiredSigs, false);

        vm.prank(BONDED_ADDRESS);
        vm.expectRevert("Dispute period ended");
        consumer.blameIllAnnounced(certifiedLogHigherBid);
    }

    function test_BlameIllAnnounced_Fail_InvalidCommittee() public {
        uint256 requiredSigs = getRequiredSigs(2, 3, Math.Rounding.Ceil);
        PodECDSA.CertifiedLog memory certifiedLog = createCertifiedLog(requiredSigs, true);

        vm.prank(SMALLER_BIDDER);
        consumer.write(certifiedLog);

        requiredSigs = getRequiredSigs(2, 3, Math.Rounding.Floor);
        PodECDSA.CertifiedLog memory certifiedLogHigherBid = createCertifiedLog(requiredSigs, false);

        vm.prank(BONDED_ADDRESS);
        vm.expectRevert("Invalid proof or quorum not reached");
        consumer.blameIllAnnounced(certifiedLogHigherBid);
    }

    function test_BlameNoShow_Success() public {
        uint256 requiredSigs = getRequiredSigs(2, 3, Math.Rounding.Ceil);
        PodECDSA.CertifiedLog memory certifiedLogSmallerBid = createCertifiedLog(requiredSigs, true);

        requiredSigs = getRequiredSigs(1, 3, Math.Rounding.Ceil);
        PodECDSA.CertifiedLog memory certifiedLogHigherBid = createCertifiedLog(requiredSigs, false);

        vm.warp(block.timestamp + consumer.DISPUTE_PERIOD());

        assert(consumer.isBonded(SMALLER_BIDDER));

        vm.prank(BONDED_ADDRESS);
        consumer.blameNoShow(certifiedLogSmallerBid);
        vm.prank(BONDED_ADDRESS);
        consumer.blameNoShow(certifiedLogHigherBid);

        vm.warp(block.timestamp + consumer.DISPUTE_PERIOD());
        PodAuctionConsumer.State memory state = consumer.read(AUCTION_ID, DEADLINE);
        assertEq(state.winner.bid, 0);
        assertEq(state.winner.bidder, address(0));
        assertEq(state.blamed.bid, 1000);
        assertEq(state.blamed.bidder, HIGHER_BIDDER);
        assert(!consumer.isBonded(HIGHER_BIDDER));
    }

    function test_BlameNoShow_Fail_InvalidCommittee() public {
        uint256 requiredSigs = getRequiredSigs(1, 3, Math.Rounding.Floor);
        PodECDSA.CertifiedLog memory certifiedLog = createCertifiedLog(requiredSigs, true);

        vm.warp(block.timestamp + consumer.DISPUTE_PERIOD());

        vm.prank(BONDED_ADDRESS);
        vm.expectRevert("Invalid proof or quorum not reached");
        consumer.blameNoShow(certifiedLog);
    }

    function test_BlameNoShow_Fail_BidAlreadyExists() public {
        uint256 requiredSigs = getRequiredSigs(2, 3, Math.Rounding.Ceil);
        PodECDSA.CertifiedLog memory certifiedLogSmallerBid = createCertifiedLog(requiredSigs, true);

        vm.prank(SMALLER_BIDDER);
        consumer.write(certifiedLogSmallerBid);

        vm.warp(block.timestamp + consumer.DISPUTE_PERIOD());

        requiredSigs = getRequiredSigs(1, 3, Math.Rounding.Ceil);
        PodECDSA.CertifiedLog memory certifiedLogHigherBid = createCertifiedLog(requiredSigs, false);

        vm.prank(BONDED_ADDRESS);
        vm.expectRevert("Bid already exists");
        consumer.blameNoShow(certifiedLogHigherBid);
    }

    function test_BlameNoShow_Fail_DisputePeriodEnded() public {
        vm.warp(block.timestamp + consumer.TWO_TIMES_DISPUTE_PERIOD());

        uint256 requiredSigs = getRequiredSigs(1, 3, Math.Rounding.Ceil);
        PodECDSA.CertifiedLog memory certifiedLogHigherBid = createCertifiedLog(requiredSigs, false);

        vm.warp(block.timestamp + consumer.TWO_TIMES_DISPUTE_PERIOD());

        vm.prank(BONDED_ADDRESS);
        vm.expectRevert("Dispute period ended");
        consumer.blameNoShow(certifiedLogHigherBid);
    }

    function test_BlameNoShow_Fail_StillInWaitingPeriod() public {
        uint256 requiredSigs = getRequiredSigs(1, 3, Math.Rounding.Ceil);
        PodECDSA.CertifiedLog memory certifiedLog = createCertifiedLog(requiredSigs, false);

        vm.prank(BONDED_ADDRESS);
        vm.expectRevert("Still in waiting period");
        consumer.blameNoShow(certifiedLog);
    }

    function test_BlameNoShow_Fail_InvalidBid() public {
        uint256 requiredSigs = getRequiredSigs(1, 3, Math.Rounding.Ceil);

        PodECDSA.CertifiedLog memory certifiedLogHigherBid = createCertifiedLog(requiredSigs, false);

        PodECDSA.CertifiedLog memory certifiedLogSmallerBid = createCertifiedLog(requiredSigs, true);

        vm.warp(block.timestamp + consumer.DISPUTE_PERIOD());

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

        PodECDSA.CertifiedReceipt memory certifiedReceipt = PodECDSA.CertifiedReceipt({
            receiptRoot: receiptRoot,
            aggregateSignature: aggregateSignature,
            medianTimestamp: 2
        });

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
        receiptRoots[0] = bytes32(0xf89a92bff4aec73b42247cad1a3da4f00692bcea1c4cb340a49123f6dc4d74e6);
        receiptRoots[1] = bytes32(0x10bfa8686ee6391651718011b617a01acc21719448bc0e70e604fa5bac40cb57);

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
        topics[0][0] = 0xfa9544cad94ab8507946215078af54be3ed0a1f19911d5dab2037baf8e064fb0;
        topics[0][1] = 0x0000000000000000000000000000000000000000000000000000000000000001;
        topics[0][2] = 0x00000000000000000000000013791790bef192d14712d627f13a55c4abee52a4;
        topics[0][3] = 0x00000000000000000000000000000000000000000000000000000000cfc37719;

        topics[1][0] = 0xfa9544cad94ab8507946215078af54be3ed0a1f19911d5dab2037baf8e064fb0;
        topics[1][1] = 0x0000000000000000000000000000000000000000000000000000000000000001;
        topics[1][2] = 0x000000000000000000000000b8aa43999c2b3cbb10fbe2092432f98d8f35dcd7;
        topics[1][3] = 0x00000000000000000000000000000000000000000000000000000000cfc37719;

        return topics[index];
    }

    function getMerklePathForBid(uint256 index) public pure returns (bytes32[] memory) {
        bytes32[][] memory paths = new bytes32[][](2);
        paths[0] = new bytes32[](5);
        paths[1] = new bytes32[](4);
        paths[0][0] = 0x6a4e143b1d6d748b27b99e09fd2b31f388814ac859501adf698eeaf4cc1f7839;
        paths[0][1] = 0x50391cf02927d8ee25a283f04a0b77605ece18b5008d540f7637f76f5671a17d;
        paths[0][2] = 0x546d91bb44af90ac0c34d8e12b47971b6c671657a1a03d886e37766652e88d98;
        paths[0][3] = 0xad770cb486fc71b80a7da875244eaf147d347ea26bc0e54e08867dc588154ecf;
        paths[0][4] = 0x40e6add0069c917287debf22d0e3fa7dabf5357e1ff8cec2ec8972be8f397b25;

        paths[1][0] = 0xd5d8c72081398392c0782d1e409e2c09d013753234a4abf60932114b1d3371d5;
        paths[1][1] = 0xf646fc9398152f92d17784eccea50b79f8e99c7550d901ef227c499cc3a94039;
        paths[1][2] = 0x63e0c3f6f6faf68ba2391c0b6576c9dd4859b78522675ce93b4703f0395c7aee;
        paths[1][3] = 0x9cb73109cea62dad0ab8338da558743a4dbef2298ed7a46c93fde81735c3e730;

        return paths[index];
    }
}
