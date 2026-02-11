# Bridge

The Pod ↔ Ethereum bridge allows ERC20 tokens to move securely between Pod and Ethereum.

When bridging:

* **Ethereum → Pod**: ERC20 tokens are locked on Ethereum and automatically issued on Pod once the deposit is detected.
* **Pod → Ethereum**: ERC20 tokens are burned on Pod and released on Ethereum after a validator proof.

> **Security model:** On Ethereum, the bridge relies on a Pod light client construction to verify attestations. On Pod, the core validator committee attests for the bridge directly from an Ethereum full node, observing deposits and crediting balances on the destination chain. This design ensures trust-minimized cross-chain state synchronization in both directions.

{% hint style="info" %}
**Pod precompile address:** `0x000000000000000000000000000000000000C10`
{% endhint %}

***

## Solidity Interfaces

### Pod Bridge

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPodBridge {
    /**
     * @dev The event emitted during deposit
     * @param id Unique deposit identifier
     * @param from Sender of the deposit
     * @param to Ethereum recipient address
     * @param amount Amount of the deposit
     */
    event Deposit(
        bytes32 indexed id,
        address indexed from,
        address indexed to,
        address token,
        uint256 amount
    );
    
    /**
     * @dev Deposit to bridge to Ethereum
     * @notice Must be submitted via pod_sendRawTransaction
     * @param token Token address on Pod
     * @param amount Amount of pUSD to bridge
     * @param to Ethereum recipient address
     * @return id Unique deposit identifier
     */
    function deposit(
        address token,
        uint256 amount,
        address to
    ) external returns (bytes32 id);
}
```

***

### Ethereum Bridge (Deposit + Claim)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IEthereumBridge {
    /**
     * @dev The event emitted during deposit
     * @param id Unique deposit identifier
     * @param from Sender of the deposit
     * @param to Pod recipient address
     * @param amount Amount of the deposit
     */
    event Deposit(
        bytes32 indexed id,
        address indexed from,
        address indexed to,
        address token,
        uint256 amount
    );
    
     /**
     * @dev The event emitted during claim.
     * @param id Unique deposit identifier
     * @param to Ethereum recipient address
     * @param amount Amount of the deposit
     */
    event Claim(
        bytes32 indexed id,
        address indexed to,
        address token,
        uint256 amount
    );
        
    /**
     * @dev Deposit to bridge to Pod
     * @param token Token address on Ethereum
     * @param amount Amount of pUSD to bridge
     * @param to Pod recipient address
     * @return id Unique deposit identifier
     */
    function deposit(
        address token,
        uint256 amount,
        address to
    ) external returns (bytes32 id);

    /**
     * @notice Claim bridged tokens using a validator proof from Pod
     * @param token token address on Ethereum
     * @param amount Amount originally deposited on Pod
     * @param to Ethereum recipient (must match deposit)
     * @param committeeEpoch Validator committee epoch
     * @param aggregatedSignatures Aggregated validator signatures
     * @param proof Canonical deposit transaction hash from Pod
     */
    function claim(
        address token,
        uint256 amount,
        address to,
        uint64 committeeEpoch,
        bytes calldata aggregatedSignatures,
        bytes calldata proof
    ) external;
}
```

## Pod → Ethereum Flow

Bridging from Pod to Ethereum requires three steps.



1. **Deposit on the Bridge:** Deposit your tokens on the bridge using `pod_sendRawTransaction` &#x20;

```solidity
deposit(token, amount, ethRecipient);
```



2. **Get the claim proof:** Call the `pod_getBridgeClaimProof(tx_hash)`   &#x20;

Response:

| Field             | Description                     |
| ----------------- | ------------------------------- |
| `signatures`      | Aggregated validator signatures |
| `committee_epoch` | Epoch for verification          |
| `proof`           | Canonical transaction hash      |

3\.  **Claim on Ethereum:** You can claim your tokens on ethereum by calling the bridge contract on ethereum:&#x20;

```solidity
claim(
    token,
    amount,
    ethRecipient,
    committeeEpoch,
    aggregatedSignatures,
    proof
);
```

{% hint style="info" %}
Anyone can submit the claim (user or relayer)
{% endhint %}

***

## Ethereum → Pod Flow

Bridging from Ethereum to Pod is simpler.



1. **Approve:** Approve you tokens to the bridgeAddress on Ethereum

```solidity
token.approve(bridgeAddress, amount);
```

2\. **Deposit:** Deposit your tokens to the bridge by calling `deposit(token, amount, podRecipient)` . Tokens will be locked on the bridge and a `Deposit` even will be emitted.&#x20;

3\. **Automatic credit on Pod:** Pod validators detect finalized deposits on Ethereum and credit:

```
podRecipient → receives pUSD
```

{% hint style="success" %}
For bridging from Ethereum to Pod, no claim transaction are required
{% endhint %}
