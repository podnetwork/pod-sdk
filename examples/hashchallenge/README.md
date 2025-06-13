# HashChallenge Contract

A smart contract for creating and responding to hash challenges with time-dependent rewards.

Responders must submit the correct preimage of a known hash within a time window. Rewards decay linearly over time.

## Overview

* Challenger submits a `hash(preimage)` and ETH reward for a specific responder.
* Responder has up to `maxDelay` seconds to reveal the preimage.
* Reward linearly decays from full amount to zero as time passes.
* Only the designated responder can claim.
* Challenger can reclaim unclaimed funds after `maxDelay`.

---

## Contract Details

* **Address:** `0x6145AC8fb73eB26588245c2afc454fC9629Ad5b3`
* **RPC:** `https://rpc.dev.pod.network`
* **Network:** Pod Devnet

---

## Commands

### 1. Fund with Dev ETH

Use the [pod faucet](https://docs.v1.pod.network/fund):

---

### 2. Create a Challenge

```sh
cast send 0x6145AC8fb73eB26588245c2afc454fC9629Ad5b3 \
  "createChallenge(bytes32,address,uint256)" \
  0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8 \
  <RESPONDER_ADDRESS> \
  180 \
  --value 1ether \
  --private-key <PRIVATE_KEY> \
  --async --legacy --gas-limit 1000000 \
  --rpc-url https://rpc.dev.pod.network
```

* `dataHash`: `keccak256(preimage)`
* `responder`: address allowed to claim
* `maxDelay`: seconds until reward decays to 0

**Example:**

```js
keccak256("hello") = 0x1c8aff95...36deac8
```

### 3. Extract Challenge ID

```sh
cast receipt <TX_HASH> --rpc-url https://rpc.dev.pod.network --json | jq '.logs[0].topics[1]' -r
```

This gives you the `challengeId`, a `uint256` derived from:

```solidity
keccak256(abi.encodePacked(dataHash, responder, maxDelay, challenger))
```

---

### 4. Claim a Challenge

```sh
cast send 0x6145AC8fb73eB26588245c2afc454fC9629Ad5b3 \
  "claimChallenge(uint256,bytes,uint256)" \
  <CHALLENGE_ID> \
  0x68656c6c6f \
  150 \
  --private-key <PRIVATE_KEY> \
  --legacy --gas-limit 1000000 \
  --rpc-url https://rpc.dev.pod.network
```

* `preimage`: e.g., `0x68656c6c6f` is "hello"
* `claimedDelay`: how many seconds since creation you *claim* have passed

> This is verified via the `Deadline` library

---

## Debugging & Monitoring

* Preview reward at any point:

```sh
cast call 0x6145AC8fb73eB26588245c2afc454fC9629Ad5b3 \
  "previewReward(uint256)" <CHALLENGE_ID> \
  --rpc-url https://rpc.dev.pod.network
```

* Fetch challenge metadata:

```sh
cast call 0x6145AC8fb73eB26588245c2afc454fC9629Ad5b3 \
  "getChallenge(uint256)" <CHALLENGE_ID> \
  --rpc-url https://rpc.dev.pod.network
```

---

## Notes

* Multiple rewards can be stacked for same challenge by calling `createChallenge()` again with same args.
* Rewards decay linearly: 0% at `maxDelay`, 100% at time zero.
* Challenge cannot be claimed twice.
* Refunds can be done incrementally by challenger.

---

## Test Values

* `keccak256("hello")`: `0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8`
* `0x68656c6c6f` is `"hello"` as bytes
