---
title: Solidity SDK Tutorial
layout: single

url: /solidity-sdk/tutorial

toc:
  setup: Setup
  reputation-example: Reputation System Example
  deployment: Deployment and Testing
---

! content id="setup"

# Solidity SDK Tutorial

## Setup

Let's start by setting up a new project with the pod Solidity SDK.

First, create a new Foundry project:

```bash
forge init my-pod-contract
cd my-pod-contract
```

Install the pod SDK:

```bash
forge install podnetwork/pod-sdk
```

Add the remapping to your `remappings.txt`:

```
pod-sdk/=lib/pod-sdk/solidity-sdk/src/
```

Now you're ready to start building with pod's fast types!

! content end

! content empty

! content id="auction-example"

## Reputation System Example

Let's build a reputation system that combines a `Counter` fast type with time operations. Users can earn reputation points during specific time periods, and the system can validate minimum reputation requirements.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {FastTypes} from "pod-sdk/FastTypes.sol";
import {requireTimeAfter, requireTimeBefore} from "pod-sdk/Time.sol";

contract ReputationSystem {
    using FastTypes for FastTypes.Counter;
    
    uint256 public seasonStart;
    uint256 public seasonEnd;
    FastTypes.Counter private totalReputation;
    
    event SeasonStarted(uint256 startTime, uint256 endTime);
    event ReputationEarned(address indexed user, uint256 points);
    event ReputationChecked(uint256 currentReputation, uint256 required, bool sufficient);
    
    constructor(uint256 seasonDurationInSeconds) {
        seasonStart = block.timestamp;
        seasonEnd = block.timestamp + seasonDurationInSeconds;
        
        totalReputation = FastTypes.Counter({
            key: keccak256("season_reputation")
        });
        
        emit SeasonStarted(seasonStart, seasonEnd);
    }
    
    function earnReputation(uint256 points) external {
        require(points > 0, "Points must be greater than 0");
        
        // Ensure season has started
        requireTimeAfter(seasonStart, "Season has not started yet");
        
        // Ensure season hasn't ended
        requireTimeBefore(seasonEnd, "Season has already ended");
        
        // Add reputation points
        totalReputation.increment(points);
        
        emit ReputationEarned(msg.sender, points);
    }
    
    function requireMinimumReputation(uint256 minimumRequired) external view {
        // Check if we have enough total reputation
        totalReputation.requireGte(minimumRequired);
        
        emit ReputationChecked(0, minimumRequired, true); // 0 is placeholder since we can't read counter directly
    }
    
    function requireSeasonActive() external view {
        requireTimeAfter(seasonStart, "Season has not started");
        requireTimeBefore(seasonEnd, "Season has ended");
    }
    
    function requireSeasonEnded() external view {
        requireTimeAfter(seasonEnd, "Season is still active");
    }
}
```

**What This Example Demonstrates:**

1. **Time-Bounded Operations**: Users can only earn reputation during active seasons
2. **Cumulative Counting**: Multiple users can earn reputation concurrently without conflicts
3. **Threshold Validation**: System can enforce minimum reputation requirements
4. **Season Management**: Clear start/end boundaries with proper validation

**Key Benefits on pod:**
- Multiple users can earn reputation simultaneously without race conditions
- Reputation increments are commutative - order doesn't affect total
- Time validation ensures fair seasonal boundaries across validators
- Minimum reputation checks are consistent across the network

! content end

! content empty

! content id="deployment"

## Deployment and Testing

Let's deploy and test our reputation system contract:

```bash
# Compile the contract
forge build

# Deploy to pod network (replace with your private key and RPC URL)
forge create --rpc-url https://rpc.pod.network \
    --private-key $PRIVATE_KEY \
    src/ReputationSystem.sol:ReputationSystem \
    --constructor-args 86400  # 24 hour season
```

Test the contract using cast:

```bash
# Set your contract address
export REPUTATION_CONTRACT="<deployed-contract-address>"

# Earn some reputation points
cast send --private-key $PRIVATE_KEY \
    --rpc-url https://rpc.pod.network \
    $REPUTATION_CONTRACT \
    "earnReputation(uint256)" \
    50

# Check if season is still active
cast call --rpc-url https://rpc.pod.network \
    $REPUTATION_CONTRACT \
    "requireSeasonActive()"

# Require minimum reputation (will revert if not enough)
cast call --rpc-url https://rpc.pod.network \
    $REPUTATION_CONTRACT \
    "requireMinimumReputation(uint256)" \
    100

# Check if season has ended (after 24 hours)
cast call --rpc-url https://rpc.pod.network \
    $REPUTATION_CONTRACT \
    "requireSeasonEnded()"
```

This tutorial demonstrates how pod's fast types and time operations work together to create practical, order-independent smart contracts that maintain consistency across validators while handling time-sensitive logic.

! content end
