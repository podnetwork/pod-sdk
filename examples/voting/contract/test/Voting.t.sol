// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {Voting} from "../src/Voting.sol";
import {REQUIRE_QUORUM} from "pod-sdk/pod/Quorum.sol";

contract MockRequireQuorum {
    fallback() external {
        bool input = abi.decode(msg.data, (bool));
        console.log("mock precompile received:", input);
        require(input, "quorum not met");
    }
}

contract VotingTest is Test {
    Voting public voting;

    function setUp() public {
        MockRequireQuorum mock = new MockRequireQuorum();
        vm.etch(REQUIRE_QUORUM, address(mock).code);

        voting = new Voting();
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
        emit Voting.PollCreated(bytes32(0), block.timestamp + 1);

        bytes32 id = voting.createPoll(block.timestamp + 1, 3, createUsers(1));
        console.log("created poll with id:");
        console.logBytes32(id);
    }

    function test_mustBeParticipantToVote() public {
        bytes32 id = voting.createPoll(block.timestamp + 1, 3, createUsers(10));
        vm.prank(vm.addr(999));
        vm.expectRevert("sender can't vote");
        voting.vote(id, 1);
    }

    function test_checksChoiceBounds() public {
        address[] memory users = createUsers(10);
        bytes32 id = voting.createPoll(block.timestamp + 1, 3, users);

        vm.startPrank(users[0]);
        vm.expectRevert("Choice must be between 1 and maxChoice");
        voting.vote(id, 0);
        vm.expectRevert("Choice must be between 1 and maxChoice");
        voting.vote(id, 4);
    }

    function test_cantVoteTwice() public {
        address[] memory users = createUsers(10);
        bytes32 id = voting.createPoll(block.timestamp + 1, 3, users);

        vm.startPrank(users[0]);
        voting.vote(id, 1);
        vm.expectRevert("sender can't vote");
        voting.vote(id, 1);
    }

    function test_cantCreatePollAfterDeadline() public {
        vm.expectRevert("Deadline must be in the future");
        address[] memory users = createUsers(10);
        voting.createPoll(block.timestamp, 3, users);
    }

    function test_cantVoteAfterDeadline() public {
        address[] memory users = createUsers(10);
        bytes32 id = voting.createPoll(block.timestamp + 1, 3, users);

        vm.warp(block.timestamp + 1);
        vm.startPrank(users[0]);
        vm.expectRevert("Poll deadline has passed or poll does not exist");
        voting.vote(id, 1);
    }

    function test_singleVoterPoll() public {
        address[] memory users = createUsers(1);
        bytes32 id = voting.createPoll(block.timestamp + 1, 3, users);

        vm.startPrank(users[0]);
        vm.expectEmit();
        emit Voting.Voted(id, users[0], 1);
        voting.vote(id, 1);

        vm.warp(block.timestamp + 2);
        vm.expectEmit(true, true, false, true);
        emit Voting.Winner(id, 1);
        voting.setWinningChoice(id, 1);
    }

    function test_voteAndPickWinner() public {
        address[] memory users = createUsers(10);
        bytes32 id = voting.createPoll(block.timestamp + 1, 3, users);

        for (uint256 i = 0; i < users.length; i++) {
            vm.startPrank(users[i]);
            vm.expectEmit();
            emit Voting.Voted(id, users[i], 1);

            voting.vote(id, 1);
        }

        (uint256 participants, uint256[] memory votes) = voting.getVotes(id);
        require(participants == 10);
        console.log("collected votes:");
        for (uint256 i = 0; i < votes.length; i++) {
            uint256 choice = i + 1;
            console.log("[%d]: %d", choice, votes[i]);
            require(votes[i] == (choice == 1 ? 10 : 0));
        }

        // before deadline
        vm.expectRevert("Poll deadline has not passed yet");
        voting.setWinningChoice(id, 1);

        // after deadline
        vm.warp(block.timestamp + 2);

        // can't vote for choice=0
        vm.expectRevert("Choice must be between 1 and maxChoice");
        voting.setWinningChoice(id, 0);

        // can't vote for choice=4
        vm.expectRevert("Choice must be between 1 and maxChoice");
        voting.setWinningChoice(id, 4);

        // can't select choice that has no votes
        vm.expectRevert("This choice has received no votes");
        voting.setWinningChoice(id, 2);

        // success
        vm.expectEmit(true, true, false, true);
        emit Voting.Winner(id, 1);
        voting.setWinningChoice(id, 1);

        // can't select winner again
        vm.expectRevert("Winner has already been set");
        voting.setWinningChoice(id, 1);
    }
}
