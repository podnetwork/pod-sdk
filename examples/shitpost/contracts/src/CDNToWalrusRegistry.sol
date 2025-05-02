pragma solidity ^0.8.25;

import {Ownable} from "./base/Ownable.sol";

contract CDNToWalrusRegistry is Ownable {
  mapping(bytes32 => bytes32) private cdnIdToWalrusId;
  mapping(bytes32 => bytes32) private walrusIdToCdnId;

  event CDNWalrusRecordCreated(bytes32 indexed cdnId, bytes32 indexed walrusId);
  
  constructor() Ownable(msg.sender) {}

  function setRecord(bytes32 cdnId, bytes32 walrusId) public onlyOwner {
    cdnIdToWalrusId[cdnId] = walrusId;
    walrusIdToCdnId[walrusId] = cdnId;

    emit CDNWalrusRecordCreated(cdnId, walrusId);
  }

  function getWalrusIdByCdnId(bytes32 cdnId) public view returns (bytes32) {
    return cdnIdToWalrusId[cdnId];
  }

  function getCdnIdByWalrusId(bytes32 walrusId) public view returns (bytes32) {
    return walrusIdToCdnId[walrusId];
  }
}
