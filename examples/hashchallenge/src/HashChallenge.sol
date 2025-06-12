// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {requireTimeAfter, requireTimeBefore} from "pod-sdk/Time.sol";

/**
 * @title HashChallenge
 * @dev Contract for creating hash challenges with time-dependent rewards
 */
contract HashChallenge {
    struct Challenge {
        bytes32 hash; // Hash of the data
        address challenger; // Address of the person who created the challenge
        address responder; // Address of the intended responder
        uint256 reward; // Total reward amount (in wei)
        uint256 creationTime; // Timestamp when the challenge was created (local per validator)
        uint256 maxDelay; // Maximum delay to be eligible for reward
        uint256 rewardedAmount; // Amount rewarded to the responder
        uint256 sequenceNumber; // Sequence number of the challenge, allows for multiple challenges with the same options
    }

    // Mapping from challenge ID to Challenge
    mapping(uint256 => Challenge) public challenges;

    // Events
    event ChallengeCreated(
        uint256 indexed challengeId, address indexed challenger, address indexed responder, uint256 reward
    );
    event ChallengeClaimed(
        uint256 indexed challengeId, address indexed responder, uint256 rewardPaid, uint256 responseTime
    );
    event ChallengeRefunded(uint256 indexed challengeId, uint256 refundAmount);

    /**
     * @dev Create a new hash challenge
     * @param dataHash The hash of the data
     * @param responder The address of the intended responder
     * @param maxDelay The maximum time in seconds for claiming full reward
     * @param sequenceNumber The sequence number of the challenge, allows for multiple challenges with the same options
     */
    function createChallenge(bytes32 dataHash, address responder, uint256 maxDelay, uint256 sequenceNumber)
        external
        payable
    {
        require(msg.value > 0, "Reward must be greater than 0");
        require(responder != address(0), "Responder cannot be zero address");

        uint256 challengeId =
            uint256(keccak256(abi.encodePacked(dataHash, responder, maxDelay, msg.sender, sequenceNumber)));

        challenges[challengeId] = Challenge({
            hash: dataHash,
            challenger: msg.sender,
            responder: responder,
            reward: msg.value + challenges[challengeId].reward,
            creationTime: block.timestamp,
            maxDelay: maxDelay,
            rewardedAmount: 0,
            sequenceNumber: sequenceNumber
        });

        emit ChallengeCreated(challengeId, msg.sender, responder, msg.value);
    }

    /**
     * @dev Calculate reward based on elapsed time, using a linear decay function
     * @param elapsedTime Time elapsed since challenge creation
     * @param maxTime Maximum delay allowed since challenge creation
     * @param totalReward Total reward amount
     * @return rewardAmount Calculated reward amount
     */
    function calculateReward(uint256 elapsedTime, uint256 maxTime, uint256 totalReward) public pure returns (uint256) {
        // effective time is at most the maxTime (cannot give negative reward)
        uint256 effectiveTime = elapsedTime < maxTime ? elapsedTime : maxTime;

        // factor is 0..1e18 (representing 0..100% of the reward)
        uint256 factor = (maxTime - effectiveTime) * 1e18 / maxTime;

        return (totalReward * factor) / 1e18;
    }

    /**
     * @dev Claim a challenge by providing the correct preimage
     * @param challengeId The ID of the challenge
     * @param preimage The preimage of the hash
     */
    function claimChallenge(uint256 challengeId, bytes calldata preimage, uint256 claimedDelay) external {
        Challenge storage challenge = challenges[challengeId];

        require(challenge.rewardedAmount == 0, "Challenge already claimed");
        require(msg.sender == challenge.responder, "Only intended responder can claim");
        require(keccak256(preimage) == challenge.hash, "Incorrect preimage");

        uint256 deadline = challenge.creationTime + claimedDelay;
        requireTimeBefore(deadline, "More than claimed delay has passed");

        uint256 rewardAmount = calculateReward(claimedDelay, challenge.maxDelay, challenge.reward);

        require(rewardAmount >= 0 && rewardAmount <= challenge.reward, "Invalid reward amount");

        challenge.rewardedAmount = rewardAmount;

        // Send reward to responder
        (bool success,) = challenge.responder.call{value: rewardAmount}("");
        require(success, "Transfer failed");

        emit ChallengeClaimed(challengeId, msg.sender, rewardAmount, claimedDelay);
    }

    /**
     * @dev Preview the current reward amount for a challenge
     * @param challengeId The ID of the challenge
     * @return Current reward amount based on elapsed time
     */
    function previewReward(uint256 challengeId) external view returns (uint256) {
        Challenge storage challenge = challenges[challengeId];
        require(challenge.rewardedAmount == 0, "Challenge already claimed");

        uint256 elapsedTime = block.timestamp - challenge.creationTime;
        return calculateReward(elapsedTime, challenge.maxDelay, challenge.reward);
    }
}
