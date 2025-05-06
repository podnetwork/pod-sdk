pragma solidity ^0.8.25;

import {FastTypes} from "./lib/FastTypes.sol";

contract ProfileRegistry {
    using FastTypes for FastTypes.Owned;

    // @dev: this is unsafe state!
    mapping(bytes32 => address) public handles;

    event HandleUpdated(address indexed user, bytes32 indexed handle);
    event PictureUpdated(address indexed user, bytes32 picture);

    function setHandle(bytes32 handle) public {
        // warning: this is not safe to do on pod!
        // people can frontrun the handle to lock your tx.
        // this should be fixed using a commit reveal scheme.
        require(handles[handle] == address(0), "Handle already taken");
        handles[handle] = msg.sender;

        FastTypes.Owned memory userHandle = FastTypes.Owned(keccak256("handle"), msg.sender);
        delete handles[userHandle.get()];

        userHandle.set(handle);
        emit HandleUpdated(msg.sender, handle);
    }

    function setPicture(bytes32 picture) public {
        FastTypes.Owned memory userPicture = FastTypes.Owned(keccak256("picture"), msg.sender);
        userPicture.set(picture);
        emit PictureUpdated(msg.sender, picture);
    }

    function resolveHandle(bytes32 handle) public view returns (address) {
        return handles[handle];
    }

    function getProfile(address user) public view returns (bytes32 handle, bytes32 picture) {
        handle = FastTypes.Owned(keccak256("handle"), user).get();
        picture = FastTypes.Owned(keccak256("picture"), user).get();
    }
}
