# Network Architecture

Pod's network consists of four types of entities: **clients**, **full nodes**, **validators**, and the **native bridge** on Ethereum.

```mermaid
graph LR
    C[Client] -->|JSON-RPC| F[Full Node]
    F -->|broadcast tx| V1[Validator 1]
    F -->|broadcast tx| V2[Validator 2]
    F -->|broadcast tx| V3[Validator 3]
    F -->|broadcast tx| V4[Validator 4]
    F -->|broadcast tx| V5[Validator 5]
    F -->|broadcast tx| V6[Validator 6 - Malicious]
    V1 -->|attestation| F
    V2 -->|attestation| F
    V3 -->|attestation| F
    V4 -->|attestation| F
    V5 -->|attestation| F
    V6 -.->|invalid attestation| F
    F -->|stream attestations| C

    U[User] -->|deposit ETH/ERC-20| B[Bridge Contract\non Ethereum]
    B -->|emit deposit event| V1
    B -->|emit deposit event| V2
    B -->|emit deposit event| V3
    B -->|emit deposit event| V4
    B -->|emit deposit event| V5
    B -->|emit deposit event| V6

    style V6 fill:#f66,stroke:#900,color:#fff
```

## Clients

Clients submit transactions to full nodes via JSON-RPC using standard Ethereum tooling (`ethers.js`, `viem`, `web3.py`, `alloy`). After submission, the client receives a stream of attestations from the validator set. Once a quorum of attestations is collected, the transaction is final.

## Full Nodes

Full nodes are the entry point to the network. They accept JSON-RPC requests from clients, broadcast transactions to the validator set, and relay attestations back. Full nodes maintain a local view of the current state but do not participate in validation.

## Validators

Validators form the core of Pod's consensus. Each validator independently receives transactions, validates them, timestamps them, and signs an attestation. Validators do not coordinate with each other before attesting - they respond directly and in parallel. A transaction is final once the client collects attestations from a supermajority (4/5) of the validator set by stake.

Validators also observe deposit events from the native bridge contract on Ethereum and credit balances accordingly.

## Native Bridge

The Pod native bridge is a smart contract deployed on Ethereum. Users deposit ETH or ERC-20 tokens into the bridge contract, which emits deposit events. Validators observe these events and increase the user's balance on Pod. Withdrawals follow the reverse flow - the user initiates a withdrawal on Pod, and once finalized, can claim their tokens from the bridge contract on Ethereum.

See [Native Bridge](../native-bridge.md) for the full deposit and withdrawal flow.
