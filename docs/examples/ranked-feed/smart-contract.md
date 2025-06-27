---
layout: simple
---

! content id="smart-contract"

## Smart Contract Definition

The feed layer organizes data streams into feeds. A `feed_id` acts as a namespace, allowing different applications or streams of data to be categorized and filtered efficiently when reading logs. For example, one feed maybe social media posts, while another images uploaded to an album. Each post is uniquely identified by a `post_id`, which is derived from the `feed_id`, the sender's address, and the post content. Votes are recorded on-chain, and events are emitted when posts are created and voted on, allowing external applications to track activity on the feeds.

! content end

! content

Below is the interface of the contract that implements this system:

! sticky

! codeblock

``` rust
pragma solidity ^0.8.25;

contract RankedFeed {
    mapping(bytes32 => uint256) public votes;
    mapping(address => mapping(bytes32 => bool)) public voted;
    
    event PostCreated(bytes32 indexed feed_id, bytes32 indexed post_id, address indexed poster, bytes post_data);
    event PostVoted(bytes32 indexed feed_id, bytes32 indexed post_id, address indexed voter);
    
    function createPost(bytes32 feed_id, bytes calldata post_data) external;
    function votePost(bytes32 feed_id, bytes32 post_id) external;
    function votes(bytes32 post_id) external view returns (uint256);
}
```

! codeblock end

! sticky end

! content end
