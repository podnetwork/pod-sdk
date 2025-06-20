---
title: Network
layout: single

url: /architecture/network

toc:
  introduction: Introduction
  network-participants: Network Participants
  network-communication-flow: Network Communication Flow
  security-considerations: Security Considerations
  best-practices: Best Practices
---

! content

# Network

## Introduction

! anchor introduction

The pod network operates through an architecture of interconnected participants, each serving specific roles in maintaining the network's efficiency, security, and accessibility.

![Network Topology](</network-topology-svg(2)(1).svg>)

**_Example diagram of a network with three clients, two nodes and three validators._**

! content end

---

! content id="network-participants"

## Network Participants

### Validators

Validators serve as the fundamental processing layer of the network, receiving and attesting to new transactions. Each validator operates independently and does not communicate with other validators, only with nodes that send and receive transactions. This architectural decision maximizes efficiency by allowing validators to process transactions using only their local state, without coordination overhead. However, this means validators may temporarily have inconsistent states as they see transactions in different order, or some validators may not see some transactions at all.

The validator's role focuses solely on transaction attestation and validation, establishing a clear separation of concerns within the network architecture.

### Nodes

Nodes act as intermediaries, broadcasting transactions to validators and collecting their attestations. The network supports two distinct node types:

`Full Nodes` maintain a comprehensive view of network activity by collecting all attestations from validators and maintaining a complete record of the network state.

`Sparse Nodes` offer a more targeted approach by collecting attestations selectively based on specific criteria, such as particular accounts or smart contracts. This selective monitoring optimizes resource usage while still maintaining network participation.

### Clients

Clients represent the application layer of the pod and come in two varieties based on their trust model:

`Verifying Clients` implement their own validation logic and verify the cryptographic proofs of transaction validity. These clients rely on nodes only for liveness—the timely delivery of new transactions and attestations. They independently verify the safety of transactions by checking validator attestations and signatures, ensuring transaction without having to trust the node they are connected to. Verifying clients may receive transaction information through various channels, including but not limited to node JSON-RPC interfaces. For example, they might be smart contracts on other blockchains.

`Non-Verifying Clients` must establish direct connections with trusted nodes and depend on them for both liveness and safety. They rely on nodes not only to receive new transactions and attestations but also to determine transaction validity. This approach optimizes for performance and simplicity but requires complete trust in the connected node's proper operation and honest behavior. As a result, non-verifying clients must carefully consider their choice of node operator.

! content end

---

! content id="network-communication-flow"

## Network Communication Flow

The pod network facilitates transaction processing through a defined communication flow:

![Network Communication Flow](</transaction-sequence-svg(1).svg>)

Network communication flow when a transaction is being broadcasted for validation assuming three validators.

- **Transaction Initiation**: Clients submit transactions through their chosen communication channel.
- **Transaction Broadcasting**: Nodes broadcast received transactions to all validators through the consensus network.
- **Transaction Validation**: Validators independently process transactions and generate attestations.
- **Attestation collection**: Nodes collect attestations according to their configuration (full or selective).
- **Client Communication**: Nodes provide transaction results and attestations to connected clients.

! content end

---

! content id="security-considerations"

## Security Considerations

Pod's security model centers on the verification of validator attestations and aggregate signatures. Full nodes collect attestations from validators and provide these to clients along with aggregate signatures. Each client can implement its own trust threshold, determining how many validator attestations it requires before considering a transaction final.

The security of the system relies on cryptographic verification rather than trust in individual components. Clients can verify the aggregate signatures provided by nodes to ensure transaction validity, rather than having to trust the nodes themselves. This allows for a flexible security model where different applications can implement varying levels of verification based on their specific requirements.

! content end

---

! content id="best-practices"

## Best Practices

Applications interacting with pod should carefully consider their trust model. There are two primary approaches to ensuring security:

The first approach is to operate with a trusted full node. Organizations can run their own full node, maintaining direct control over their network interface. This model is suitable for applications where the organization can ensure the integrity of their node infrastructure.

The second approach is to implement attestation verification at the client level. In this model, clients verify the aggregate signatures provided by nodes, checking that a sufficient number of validators have attested to each transaction. This verification can be calibrated to require different quorum levels depending on the application's security needs.

For critical applications, implementing robust signature verification is recommended even when working with trusted nodes, as this provides an additional layer of security. The level of verification can be adjusted based on transaction value and importance.

! content end


