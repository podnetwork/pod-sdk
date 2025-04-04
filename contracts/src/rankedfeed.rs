use alloy_sol_types::sol;

sol! {
    // solc --optimize --bin RankedFeed.sol -o build --overwrite --evm-version berlin
    contract RankedFeed {
        mapping(bytes32 => uint256) public votes;
        mapping(address => mapping(bytes32 => bool)) public voted;

        event PostCreated(bytes32 indexed post_id, address indexed poster, bytes post_data);
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
}

#[cfg(test)]
mod tests {
    use super::*;
    use alloy_sol_types::SolCall;

    #[test]
    fn test_decode_createpost() {
        // Decode calldata according to createPost

        let calldata = vec![
            223, 186, 162, 251, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 121, 123, 34, 116, 105, 116, 108, 101, 34, 58, 34,
            116, 101, 115, 116, 34, 44, 34, 99, 114, 101, 97, 116, 101, 100, 65, 116, 34, 58, 49,
            55, 52, 51, 49, 53, 54, 49, 54, 57, 52, 51, 48, 44, 34, 105, 109, 97, 103, 101, 72, 97,
            115, 104, 34, 58, 34, 55, 56, 48, 99, 52, 101, 48, 48, 101, 50, 57, 52, 56, 100, 53,
            53, 53, 55, 51, 51, 54, 49, 50, 99, 50, 102, 51, 97, 98, 51, 49, 97, 54, 98, 53, 48,
            98, 57, 52, 98, 57, 55, 48, 57, 99, 102, 57, 49, 57, 50, 53, 54, 54, 55, 50, 101, 100,
            48, 53, 54, 98, 51, 101, 57, 34, 125, 0, 0, 0, 0, 0, 0, 0,
        ];
        let call = RankedFeed::createPostCall::abi_decode(&calldata, true).unwrap();
        let post_data = String::from_utf8(call.post_data.to_vec()).unwrap();
        println!("{}", post_data);
    }
}
