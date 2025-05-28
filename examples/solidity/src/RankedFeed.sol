pragma solidity ^0.8.25;

contract RankedFeed {
    mapping(bytes32 => uint256) public votes;
    mapping(address => mapping(bytes32 => bool)) public voted;

    event PostCreated(
        bytes32 indexed post_id,
        address indexed poster,
        bytes post_data
    );
    event PostVoted(bytes32 indexed post_id, address indexed voter);

    error AlreadyVoted();

    function createPost(bytes calldata post_data) public {
        // This doesn't really imply that it was already created,
        // but checking `voted` avoids having a separated `created` mapping
        bytes32 post_id = keccak256(abi.encodePacked(msg.sender, post_data));
        if (voted[msg.sender][post_id]) {
            revert AlreadyVoted();
        }
        votes[post_id] += 1;
        voted[msg.sender][post_id] = true;
        emit PostCreated(post_id, msg.sender, post_data);
    }

    function votePost(bytes32 post_id) public {
        if (voted[msg.sender][post_id]) {
            revert AlreadyVoted();
        }
        voted[msg.sender][post_id] = true;
        votes[post_id] += 1;
        emit PostVoted(post_id, msg.sender);
    }
}
