---
title: Architecture Basics
layout: single

url: /architecture/architecture-basics

toc:
  overview: Overview
  network-participants: Network Participants
  network-communication-flow: Network Communication Flow
  transaction-lifecycle: Transaction Lifecycle
  performance-characteristics: Performance Characteristics
  best-practices: Best Practices
---

# Architecture Basics

## Network

The pod network operates through an architecture of interconnected participants, each serving specific roles in maintaining the network's efficiency, security, and accessibility

![Pod Network Architecture](</network-topology-svg(2).svg>)

Example diagram of a network with three clients, two nodes and three validators.

---

## Network Participants

! anchor network-participants

### Validators

Validators serve as the fundamental processing layer of the network, receiving and attesting to new transactions. Each validator operates independently and does not communicate with other validators, only with nodes that send and receive transactions. This architectural decision maximizes efficiency by allowing validators to process transactions using only their local state, without coordination overhead. However, this means validators may temporarily have inconsistent states as they see transactions in different order, or some validators may not see some transactions at all.

The validator's role focuses solely on transaction attestation and validation, establishing a clear separation of concerns within the network architecture.

---

### Nodes

Nodes act as intermediaries, broadcasting transactions to validators and collecting their attestations. The network supports two distinct node types:

Full Nodes maintain a comprehensive view of network activity by collecting all attestations from validators and maintaining a complete record of the network state.

Sparse Nodes offer a more targeted approach by collecting attestations selectively based on specific criteria, such as particular accounts or smart contracts. This selective monitoring optimizes resource usage while still maintaining network participation.

---

### Clients

Clients represent the application layer of the pod and come in two varieties based on their trust model:

Verifying Clients implement their own validation logic and verify the cryptographic proofs of transaction validity. These clients rely on nodes only for liveness—the timely delivery of new transactions and attestations. They independently verify the safety of transactions by checking validator attestations and signatures, ensuring transaction without having to trust the node they are connected to. Verifying clients may receive transaction information through various channels, including but not limited to node JSON-RPC interfaces. For example, they might be smart contracts on other blockchains.

Non-Verifying Clients must establish direct connections with trusted nodes and depend on them for both liveness and safety. They rely on nodes not only to receive new transactions and attestations but also to determine transaction validity. This approach optimizes for performance and simplicity but requires complete trust in the connected node's proper operation and honest behavior. As a result, non-verifying clients must carefully consider their choice of node operator.

---

## Network Communication Flow

! anchor network-communication-flow

The pod network facilitates transaction processing through a defined communication flow:

![Transaction Sequence](/transaction-sequence-svg.svg)

Network communication flow when a transaction is being broadcasted for validation assuming three validators.

1. **Transaction Initiation**: Clients submit transactions through their chosen communication channel.
2. **Transaction Broadcasting**: Nodes broadcast received transactions to all validators through the consensus network.
3. **Transaction Validation**: Validators independently process transactions and generate attestations.
4. **Attestation Collection**: Nodes collect attestations according to their configuration (full or selective).
5. **Client Communication**: Nodes provide transaction results and attestations to connected clients.

---

### Security Considerations

Pod's security model centers on the verification of validator attestations and aggregate signatures. Full nodes collect attestations from validators and provide these to clients along with aggregate signatures. Each client can implement its own trust threshold, determining how many validator attestations it requires before considering a transaction final.

The security of the system relies on cryptographic verification rather than trust in individual components. Clients can verify the aggregate signatures provided by nodes to ensure transaction validity, rather than having to trust the nodes themselves. This allows for a flexible security model where different applications can implement varying levels of verification based on their specific requirements.

---

### Best Practices

Applications interacting with pod should carefully consider their trust model. There are two primary approaches to ensuring security:

The first approach is to operate with a trusted full node. Organizations can run their own full node, maintaining direct control over their network interface. This model is suitable for applications where the organization can ensure the integrity of their node infrastructure.

The second approach is to implement attestation verification at the client level. In this model, clients verify the aggregate signatures provided by nodes, checking that a sufficient number of validators have attested to each transaction. This verification can be calibrated to require different quorum levels depending on the application's security needs.

For critical applications, implementing robust signature verification is recommended even when working with trusted nodes, as this provides an additional layer of security. The level of verification can be adjusted based on transaction value and importance.

---

## Transaction Lifecycle

! anchor transaction-lifecycle

### Overview

Pod implements a leaderless consensus mechanism where transaction finalization occurs through validator attestations rather than traditional block creation. This approach enables rapid transaction finality through a quorum-based certification process.

---

### Transaction States

A transaction in pod progresses through several distinct states:

1. **Submitted**: Transaction is broadcasted to the network
2. **Validated**: Individual validators have processed the transaction
3. **Attested**: Validators have provided signed attestations
4. **Finalized**: Sufficient attestations have been collected to form a certificate

---

### Detailed Process Flow

#### Transaction Submission

When a client submits a transaction to pod:

1. Client sends transaction via JSON-RPC to a connected node
2. Node validates basic transaction format and parameters
3. Node forwards valid transaction to validators through consensus network

#### Validator Processing

Unlike traditional blockchain systems, pod doesn't batch transactions into blocks or rely on leader election. Instead:

1. Each validator independently:
   - Receives the transaction
   - Validates transaction format and signatures
   - Checks account balances and nonce values
   - If calling a smart contract function, checks that the function accepts the calldata, always ensuring enough gas was paid.
2. Upon successful validation, generates signed attestations containing:
   - Transaction hash
   - Validator's signature

#### Attestation Collection

Nodes collect attestations from validators according to their configuration:

1. Collect all attestations from all validators
2. Maintain complete network state
3. Track attestation quorum for all transactions

#### Certificate Formation

A transaction reaches finality when:

1. More than two-thirds of validators have provided attestations
2. The attestations are cryptographically valid
3. The attestations form a consistent view of the transaction

> The two-thirds threshold can be adjusted by clients who have different trust assumptions on the number of faulty nodes on the network. There is a trade-off between liveness and safety when adjusting this threshold.

#### Transaction Finalization

Once a certificate is formed:

1. Nodes update their local state
2. Clients can query transaction status via JSON-RPC
3. The transaction is considered irreversible

---

## Performance Characteristics

! anchor performance-characteristics

Pod's leaderless consensus mechanism offers several advantages:

1. Fast Finality: Transactions can finalize as soon as sufficient attestations are collected, without waiting for block creation
2. Consistent Latency: No block time variability or leader election delays
3. High Throughput: Parallel processing by validators without block size limitations

---

## Best Practices

! anchor best-practices

When implementing applications on pod:

1. Always wait for transaction finalization before considering transactions complete.
2. Monitor transaction receipts to verify attestation collection.
3. Implement appropriate error handling for transaction submission and monitoring.
4. Consider using verifying clients for critical applications.

> For high-value transactions, consider waiting for additional attestations beyond the minimum quorum for additional security.



