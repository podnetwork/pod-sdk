---
title: Transaction Lifecycle
layout: single

url: /architecture/transaction-lifecycle

toc:
  overview: Overview
  transaction-states: Transaction States
  detailed-process-flow: Detailed Process Flow
  performance-characteristics: Performance Characteristics
  best-practices: Best Practices
---

! content

# Transaction Lifecycle

A description of how transactions are broadcasted and finalised on pod.

## Overview

! anchor overview

Pod implements a leaderless consensus mechanism where transaction finalization occurs through validator attestations rather than traditional block creation. This approach enables rapid transaction finality through a quorum-based certification process.

! content end

---

! content id="transaction-states"

## Transaction States

A transaction in pod progresses through several distinct states:

1. **Submitted**: Transaction is broadcasted to the network
2. **Validated**: Individual validators have processed the transaction
3. **Attested**: Validators have provided signed attestations
4. **Finalized**: Sufficient attestations have been collected to form a certificate

! content end

---

! content id="detailed-process-flow"

## Detailed Process Flow

### Transaction Submission

When a client submits a transaction to pod:

- Client sends transaction via JSON-RPC to a connected node
- Node validates basic transaction format and parameters
- Node forwards valid transaction to validators through consensus network

### Validator Processing

Unlike traditional blockchain systems, pod doesn't batch transactions into blocks or rely on leader election. Instead:

Each validator independently:\*\*\*

- Receives the transaction
- Validates transaction format and signatures
- Checks account balances and nonce values
- If calling a smart contract function, checks that the function accepts the calldata, always ensuring enough gas was paid.

Upon successful validation, validators generate signed attestations containing:

- Transaction hash
- Validator's signature

### Attestation Collection

Nodes collect attestations from validators according to their configuration:

- Collect all attestations from all validators
- Maintain complete network state
- Track attestation quorum for all transactions

### Certificate Formation

A transaction reaches finality when:

- More than two-thirds of validators have provided attestations
- The attestations are cryptographically valid
- The attestations form a consistent view of the transaction

> The two-thirds threshold can be adjusted by clients who have different trust assumptions on the number of faulty nodes on the network. There is a trade-off between liveness and safety when adjusting this threshold.

### Transaction Finalization

Once a certificate is formed:

- Nodes update their local state
- Clients can query transaction status via JSON-RPC
- The transaction is considered irreversible

! content end

---

! content id="performance-characteristics"

## Performance Characteristics

Pod's leaderless consensus mechanism offers several advantages:

- **Fast Finality**: Transactions can finalize as soon as sufficient attestations are collected, without waiting for block creation
- **Consistent Latency**: No block time variability or leader election delays
- **High Throughput**: Parallel processing by validators without block size limitations

! content end

---

! content id="best-practices"

## Best Practices

When implementing applications on pod:

1. Always wait for transaction finalization before considering transactions complete.
2. Monitor transaction receipts to verify attestation collection.
3. Implement appropriate error handling for transaction submission and monitoring.
4. Consider using verifying clients for critical applications.

> For high-value transactions, consider waiting for additional attestations beyond the minimum quorum for additional security.

! content end
