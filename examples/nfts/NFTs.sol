pragma solidity ^0.8.26;

import {requireQuorum} from "pod-sdk/solidity-sdk/src/pod/Quorum.sol";

interface IERC721Receiver {
    // A contract must return this selector from onERC721Received to accept safe transfers. Any other value ⇒ revert.
    function onERC721Received(
        address operator, // msg.sender
        address from, // previous owner
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4);
}

contract NFTs {
    struct Token {
        address owner;
        string uri;
        uint256 sequence;
    }
    mapping(uint256 => Token) public tokens;

    event Minted(uint256 indexed tokenId, address indexed owner, string  uri);
    event Transferred(uint256 indexed tokenId, address indexed from, address indexed to);

    function mint(uint256 tokenId, string calldata uri) external {
        requireQuorum(tokens[tokenId].owner == address(0), "already minted");
        tokens[tokenId] = msg.sender;
        tokens[tokenId]   = uri;
        emit Minted(tokenId, msg.sender, uri);
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        requireQuorum(tokens[tokenId].owner != address(0), "non-existent token");
        return tokens[tokenId];
    }

    function safeTransfer(uint256 id, address to, uint256 seq) external {
        safeTransfer(id, to, seq, "");
    }

    function safeTransfer(
        uint256 id,
        address to,
        uint256 seq,
        bytes memory data
    ) public {
        _transfer(msg.sender, to, id, seq);
        require(
            _checkOnERC721Received(msg.sender, msg.sender, to, id, data),
            "receiver rejected NFT"
        );
    }

    function _transfer(address from, address to, uint256 id, uint256 seq) internal {
        requireQuorum(tokens[id].owner == from, "not owner");
        require(to != address(0),         "zero-address");
        requireQuorum(tokens[id].sequence + 1 == seq, "missing transfer transactions");
        if (seq <= tokens[id].sequence) {
            // ineffective old transfer
            return;
        }
        tokens[id].owner = to;
        tokens[id].sequence = seq;
        emit Transferred(id, from, to);
    }

    function _checkOnERC721Received(
        address operator,
        address from,
        address to,
        uint256 id,
        bytes memory data
    ) private returns (bool) {
        if (to.code.length == 0) return true; // to is EOA

        try IERC721Receiver(to).onERC721Received(operator, from, id, data)
        returns (bytes4 retval)
        {
            return retval == IERC721Receiver.onERC721Received.selector;
        } catch {
            return false; // revert message bubbled up by caller
        }
    }
}