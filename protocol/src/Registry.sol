// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Registry
 * @notice Manages a dynamic set of validators for quorum verification.
 */
contract Registry is Ownable {
    error ValidatorIsZeroAddress();
    error ValidatorDoesNotExist();
    error DuplicateValidator();
    error InvalidAdverserialResilience();
    error InvalidSignatureOrder();
    error SignerNotActiveValidator();

    event ValidatorAdded(address indexed validator);
    event ValidatorRemoved(address indexed validator);

    bytes32 public domainSeperator;
    uint64 public adversarialResilience;
    uint64 public validatorCount;

    mapping(address => bool) public activeValidators;

    constructor(address[] memory _validators, uint64 _adversarialResilience) Ownable(msg.sender) {
        _addRemoveValidators(_validators, new address[](0));
        _setAdversarialResilience(_adversarialResilience);

        domainSeperator = keccak256(
            abi.encode(keccak256("pod network"), keccak256("attest_tx_bridge"), block.chainid)
        );
    }

    function _addRemoveValidators(address[] memory addValidators, address[] memory removeValidators) internal {
        for (uint64 j = 0; j < removeValidators.length; ++j) {
            address validator = removeValidators[j];
            if (!activeValidators[validator]) {
                revert ValidatorDoesNotExist();
            }
            activeValidators[validator] = false;
            emit ValidatorRemoved(validator);
        }

        for (uint64 i = 0; i < addValidators.length; ++i) {
            address validator = addValidators[i];
            if (validator == address(0)) {
                revert ValidatorIsZeroAddress();
            }
            if (activeValidators[validator]) {
                revert DuplicateValidator();
            }
            activeValidators[validator] = true;
            emit ValidatorAdded(validator);
        }

        validatorCount = uint64(uint256(validatorCount) + addValidators.length - removeValidators.length);
    }

    function _setAdversarialResilience(uint64 _adversarialResilience) internal {
        if (_adversarialResilience == 0 || _adversarialResilience > validatorCount) {
            revert InvalidAdverserialResilience();
        }
        adversarialResilience = _adversarialResilience;
    }

    function _recoverSignerAt(bytes32 digest, bytes calldata aggregateSignature, uint256 index)
        internal
        pure
        returns (address signer)
    {
        uint256 offset;
        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            offset := add(aggregateSignature.offset, mul(index, 65))
            r := calldataload(offset)
            s := calldataload(add(offset, 32))
            v := byte(0, calldataload(add(offset, 64)))
        }

        signer = ecrecover(digest, v, r, s);
        require(signer != address(0), "Invalid signature");
    }

    /**
     * @notice Update the validator set and adversarial resilience.
     * @param newResilience The new adversarial resilience threshold.
     * @param addValidators Validators to add.
     * @param removeValidators Validators to remove.
     */
    function updateConfig(
        uint64 newResilience,
        address[] memory addValidators,
        address[] memory removeValidators
    ) external onlyOwner {
        _addRemoveValidators(addValidators, removeValidators);
        _setAdversarialResilience(newResilience);
    }

    /**
     * @notice Compute the weight of signatures for a transaction hash.
     * @param txHash The transaction hash to verify.
     * @param aggregateSignature The aggregated signatures.
     * @return weight The number of valid signatures.
     * @return n The total number of validators.
     * @return f The adversarial resilience threshold.
     */
    function computeTxWeight(bytes32 txHash, bytes calldata aggregateSignature)
        public
        view
        returns (uint256 weight, uint256 n, uint256 f)
    {
        uint256 count = aggregateSignature.length / 65;
        address lastSigner = address(0);

        for (uint256 i = 0; i < count; ++i) {
            address signer = _recoverSignerAt(txHash, aggregateSignature, i);
            if (signer <= lastSigner) {
                revert InvalidSignatureOrder();
            }
            if (!activeValidators[signer]) {
                revert SignerNotActiveValidator();
            }
            lastSigner = signer;
        }

        return (count, validatorCount, adversarialResilience);
    }
}
