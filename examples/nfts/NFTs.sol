pragma solidity ^0.8.26;

import {requireQuorum} from "pod-sdk/solidity-sdk/src/pod/Quorum.sol";

contract NFTs {
    // owner address -> [tokenId -> balance]
    mapping(address => mapping(uint256 => int8)) public tokensBalance;
    // tokenId -> uri
    mapping(uint256 => string) public tokensUri;

    address public deployer;

    constructor() {
        deployer = msg.sender;  // store the deployer address
    }

    event Minted(uint256 indexed tokenId, address indexed owner, string  uri);
    event Transferred(uint256 indexed tokenId, address indexed from, address indexed to);

    function transfer(address to, uint256 tokenId) external {
        require(to != address(0),         "zero-address");
        requireQuorum(tokensBalance[msg.sender][tokenId] == 1, "not owner");

        tokensBalance[msg.sender][tokenId] -= 1;
        tokensBalance[to][tokenId] += 1;
        emit Transferred(tokenId, msg.sender, to);
    }

    function mint(uint256 tokenId, string uri) external {
        require(msg.sender == deployer, "not allowed to mint");

        tokensBalance[msg.sender][tokenId] = 1;
        tokensUri[tokenId] = uri;
        emit Minted(tokenId, msg.sender, uri);
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        return tokensUri[tokenId];
    }
}