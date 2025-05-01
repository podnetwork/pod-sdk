pragma solidity ^0.8.25;

import { FastTypes } from './lib/FastTypes.sol';

contract RankedFeed {
    using FastTypes for FastTypes.Owned;
    using FastTypes for FastTypes.Counter;

	event PostCreated(bytes32 indexed post_id, address indexed poster, bytes post_data);
	event PostVoted(bytes32 indexed post_id, address indexed voter);

	error AlreadyVoted();

	function createPost(bytes calldata post_data) public {
		// This doesn't really imply that it was already created,
		// but checking `voted` avoids having a separated `created` mapping
		bytes32 post_id = keccak256(abi.encodePacked(msg.sender, post_data));
		FastTypes.Owned memory postUpvoted = FastTypes.Owned(post_id, msg.sender);
		if (postUpvoted.get() != bytes32(0)) {
			revert AlreadyVoted();
		}
		postUpvoted.set(bytes32(uint256(1)));

		FastTypes.Counter memory upvoteCount = FastTypes.Counter(post_id);
		upvoteCount.increment(1);

		emit PostCreated(post_id, msg.sender, post_data);
	}

	function votePost(bytes32 post_id) public {
		FastTypes.Owned memory postUpvoted = FastTypes.Owned(post_id, msg.sender);
		if (postUpvoted.get() != bytes32(0)) {
			revert AlreadyVoted();
		}
		postUpvoted.set(bytes32(uint256(1)));

		FastTypes.Counter memory upvoteCount = FastTypes.Counter(post_id);
		upvoteCount.increment(1);
		emit PostVoted(post_id, msg.sender);
	}
}
