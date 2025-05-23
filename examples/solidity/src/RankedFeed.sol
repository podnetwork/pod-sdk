pragma solidity ^0.8.25;

import {FastTypes} from "./lib/FastTypes.sol";

contract RankedFeed {
    using FastTypes for FastTypes.SharedCounter;
    using FastTypes for FastTypes.OwnedCounter;

    FastTypes.SharedCounter _upvoteCounts;
    FastTypes.OwnedCounter _postUpvoted;

    event PostCreated(bytes32 indexed post_id, address indexed poster, bytes post_data);
    event PostVoted(bytes32 indexed post_id, address indexed voter);

    error AlreadyVoted();

    function createPost(bytes calldata post_data) public {
        // This doesn't really imply that it was already created,
        // but checking `voted` avoids having a separated `created` mapping
        bytes32 post_id = keccak256(abi.encodePacked(msg.sender, post_data));

        if (_postUpvoted.get(post_id, msg.sender) != 0) {
            revert AlreadyVoted();
        }
        _postUpvoted.set(post_id, msg.sender, 1);

        _upvoteCounts.increment(post_id, 1);

        emit PostCreated(post_id, msg.sender, post_data);
    }

    function votePost(bytes32 post_id) public {
        if (_postUpvoted.get(post_id, msg.sender) != 0) {
            revert AlreadyVoted();
        }
        _postUpvoted.set(post_id, msg.sender, 1);

        _upvoteCounts.increment(post_id, 1);
        emit PostVoted(post_id, msg.sender);
    }
}
