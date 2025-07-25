// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {console} from "forge-std/console.sol";
import {Voting} from "../src/Voting.sol";
import {PodTest} from "pod-sdk/test/podTest.sol";
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

    function test_createPoll() public {
        vm.expectEmit(false, true, false, true);
        emit Voting.PollCreated(bytes32(0), Time.currentTime().addSeconds(1));

        bytes32 id = voting.createPoll(Time.currentTime().addSeconds(1), 3, createUsers(1));
        console.log("created poll with id:");
        console.logBytes32(id);
    }

    function test_mustBeParticipantToVote() public {
        bytes32 id = voting.createPoll(Time.currentTime().addSeconds(1), 3, createUsers(10));
        vm.prank(vm.addr(999));
        vm.expectRevert("sender can't vote");
        voting.vote(id, 1);
    }

    function test_checksChoiceBounds() public {
        address[] memory users = createUsers(10);
        bytes32 id = voting.createPoll(Time.currentTime().addSeconds(1), 3, users);

        vm.startPrank(users[0]);
        vm.expectRevert("Choice must be between 1 and maxChoice");
        voting.vote(id, 0);
        vm.expectRevert("Choice must be between 1 and maxChoice");
        voting.vote(id, 4);
    }

    function test_cantVoteTwice() public {
        address[] memory users = createUsers(10);
        bytes32 id = voting.createPoll(Time.currentTime().addSeconds(1), 3, users);

        vm.startPrank(users[0]);
        voting.vote(id, 1);
        vm.expectRevert("sender can't vote");
        voting.vote(id, 1);
    }

    function test_cantCreatePollAfterDeadline() public {
        Time.Timestamp currentTime = Time.currentTime();
        address[] memory users = createUsers(10);

        vm.expectRevert("Deadline must be in the future");
        voting.createPoll(currentTime, 3, users);
    }

    function test_cantVoteAfterDeadline() public {
        address[] memory users = createUsers(10);
        bytes32 id = voting.createPoll(Time.currentTime().addSeconds(1), 3, users);

        podWarp(Time.currentTime().addSeconds(1));
        vm.startPrank(users[0]);
        vm.expectRevert("Poll deadline has passed or poll does not exist");
        voting.vote(id, 1);
    }

    function test_singleVoterPoll() public {
        address[] memory users = createUsers(1);
        bytes32 id = voting.createPoll(Time.currentTime().addSeconds(1), 3, users);

        vm.startPrank(users[0]);
        vm.expectEmit();
        emit Voting.Voted(id, users[0], 1);
        voting.vote(id, 1);

        podWarp(Time.currentTime().addSeconds(2));
        vm.expectEmit(true, true, false, true);
        emit Voting.Winner(id, 1);
        voting.setWinningChoice(id, 1);
    }
}
