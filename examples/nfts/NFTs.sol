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
    mapping(uint256 => address) public tokensOwners;   // tokenId → owner
    mapping(uint256 => string)  private tokenURIs;     // tokenId → metadata URI

    event Minted(uint256 indexed tokenId, address indexed owner, string  uri);
    event Transferred(uint256 indexed tokenId, address indexed from, address indexed to);

    function mint(uint256 tokenId,string calldata uri) external {
        requireQuorum(tokensOwners[tokenId] == address(0), "already minted");
        tokensOwners[tokenId] = msg.sender;
        tokenURIs[tokenId]   = uri;
        emit Minted(tokenId, msg.sender, uri);
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        requireQuorum(tokensOwners[tokenId] != address(0), "non-existent token");
        return tokenURIs[tokenId];
    }

    function safeTransfer(uint256 id, address to) external {
        safeTransfer(id, to, "");
    }

    function safeTransfer(
        uint256 id,
        address to,
        bytes memory data
    ) public {
        _transfer(msg.sender, to, id);
        require(
            _checkOnERC721Received(msg.sender, msg.sender, to, id, data),
            "receiver rejected NFT"
        );
    }

    function _transfer(address from, address to, uint256 id) internal {
        requireQuorum(tokensOwners[id] == from, "not owner");
        require(to != address(0),         "zero-address");

        tokensOwners[id] = to;
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