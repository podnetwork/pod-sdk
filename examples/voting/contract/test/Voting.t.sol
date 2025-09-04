// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {console} from "forge-std/console.sol";
import {Voting} from "../src/Voting.sol";
import {PodTest} from "pod-sdk/test/PodTest.sol";
import {Time} from "pod-sdk/Time.sol";

contract VotingTest is PodTest {
    using Time for Time.Timestamp;

    Voting public voting;

    function setUp() public {
        podWarp(Time.fromSeconds(1753372898));
        podMockQuorum();

        voting = new Voting();
    }

    function tearDown() public {
        vm.clearMockedCalls();
    }

    function createUsers(uint256 userNum) public pure returns (address[] memory) {
        address[] memory users = new address[](userNum);

        for (uint256 i = 0; i < userNum; i++) {
            users[i] = vm.addr(i + 1);
        }
        return users;
    }

    function test_createProposal() public {
        vm.expectEmit(false, true, false, true);
        emit Voting.ProposalCreated(bytes32(0), Time.currentTime().addSeconds(1), "test");

        bytes32 id = voting.createProposal(Time.currentTime().addSeconds(1), 3, createUsers(1), "test");
        console.log("created proposal with id:");
        console.logBytes32(id);
    }

    function test_mustBeParticipantToVote() public {
        bytes32 id = voting.createProposal(Time.currentTime().addSeconds(1), 3, createUsers(10), "test");
        vm.prank(vm.addr(999));
        vm.expectRevert("sender not a voter");
        voting.castVote(id, 1);
    }

    function test_cantVoteTwice() public {
        address[] memory users = createUsers(10);
        bytes32 id = voting.createProposal(Time.currentTime().addSeconds(1), 3, users, "test");

        vm.startBroadcast(users[0]);
        voting.castVote(id, 1);
        vm.expectRevert("already voted");
        voting.castVote(id, 1);
    }

    function test_cantCreateProposalAfterDeadline() public {
        Time.Timestamp currentTime = Time.currentTime();
        address[] memory users = createUsers(10);

        vm.expectRevert("Deadline must be in the future");
        voting.createProposal(currentTime, 3, users, "test");
    }

    function test_cantVoteAfterDeadline() public {
        address[] memory users = createUsers(10);
        bytes32 id = voting.createProposal(Time.currentTime().addSeconds(1), 3, users, "test");

        podWarp(Time.currentTime().addSeconds(1));
        vm.startPrank(users[0]);
        vm.expectRevert("Proposal deadline has passed or proposal does not exist");
        voting.castVote(id, 1);
    }

    function test_singleVoterProposal() public {
        address[] memory users = createUsers(1);
        bytes32 id = voting.createProposal(Time.currentTime().addSeconds(1), 3, users, "test");

        vm.startBroadcast(users[0]);
        vm.expectEmit();
        emit Voting.VoteCast(id, users[0], 1);
        voting.castVote(id, 1);

        podWarp(Time.currentTime().addSeconds(2));
        vm.expectEmit(true, true, false, true);
        emit Voting.ProposalExecuted(id);
        voting.execute(id);
    }

    function test_voteAndPickWinner() public {
        address[] memory users = createUsers(10);
        bytes32 id = voting.createProposal(Time.currentTime().addSeconds(1), 3, users, "test");

        for (uint256 i = 0; i < users.length; i++) {
            vm.startBroadcast(users[i]);
            vm.expectEmit();
            emit Voting.VoteCast(id, users[i], 1);

            voting.castVote(id, 1);
            vm.stopBroadcast();
        }

        vm.startBroadcast(users[0]);

        // before deadline
        vm.expectRevert("Proposal deadline has not passed yet");
        voting.execute(id);

        // after deadline
        podWarp(Time.currentTime().addSeconds(2));

        // success
        vm.expectEmit(true, true, false, true);
        emit Voting.ProposalExecuted(id);
        voting.execute(id);

        // can't select execute again
        vm.expectRevert("Proposal already executed");
        voting.execute(id);
    }
}
