---
title: Partial Order
layout: simple

url: /architecture/fast-path

toc:
  overview: Overview
  how-pod-achieves-weak-consensus: How pod Achieves Weak Consensus
  wiggle-room-instead-of-order: Wiggle Room Instead of Order
  compatible-operations: Compatible Operations
  operations-requiring-full-consensus: Operations Requiring Full Consensus
  implementation-guidelines: Implementation Guidelines
  conclusion: Conclusion

---

! content

# Partial order

How pod achieves a weaker form of consensus that does not give total but only partial order, and how that affects applications building on top of pod.

## Overview

! anchor overview

Pod achieves high performance through a giving up on full consensus. Instead of requiring strong consensus where all participants agree on exact transaction order, pod employs weaker consensus that allows transactions to have some temporal flexibility while maintaining critical safety guarantees.

! content end

! content empty

---

! content

## How pod Achieves Weak Consensus

! anchor how-pod-achieves-weak-consensus

### Independent Validator Operation

The key distinction in pod compared to most distributed ledgers is that validators operate completely independently:

- Each validator maintains its own local log
- Validators never communicate directly with each other
- Each validator processes transactions based on its local view
- Validators sign timestamps based on their local clock

This independent operation eliminates the communication overhead traditional consensus requires.

! content end

! content empty

---

! content

### Wiggle Room Instead of Order

! anchor wiggle-room-instead-of-order

Rather than agreeing on exact timestamp for a transaction, pod provides a timestamp with a "wiggle room":

**Confirmation timestamp**

- The median of all timestamps in a certificate is called a confirmation timestamp.

**Wiggle room**

- The confirmation timestamp is not the same for all clients.
- Pod provides a minimum possible and maximum possible confirmation timestamp.
- Any other client's confirmation timestamp is within the minimum and maximum possible timestamps.

! content end

! content empty

---

! content

### Compatible Operations

! anchor compatible-operations

The weak consensus model works well for operations that don't require strict ordering:

#### Single-Owner Operations

Operations where all state changes are controlled by one account:

- Sequenced naturally by sender's transaction nonce
- No coordination needed with other participants
- Order relative to other accounts doesn't matter

#### Commutative Operations

Operations where execution order doesn't affect outcome

! content end

! content

! sticky

**Example: Payments Payments work because they have asymmetric access patterns:**

- `Sender`: Only owner can deduct (checked by nonce)
- `Receiver`: Anyone can add (commutative operation)
- No coordination needed between different payments

! codeblock title="Simplified payment example"

```rust
// Simplified payment example
function transfer(address to, uint256 amount) public {
    // Only owner can deduct (ordered by nonce)
    require(balances[msg.sender] >= amount);
    balances[msg.sender] -= amount;
    
    // Anyone can add (commutative)
    balances[to] += amount;
}
```

! codeblock end

! sticky end

! content end

---

! content

## Operations Requiring Full Consensus

! anchor operations-requiring-full-consensus

Some operations fundamentally require strict ordering:

#### Order-Dependent Results

- Traditional AMM swaps
- Auctions with price competition
- Operations where outcome depends on exact execution order

#### State-Dependent Validity

- Operations that need exact state for validation
- Complex multi-step processes
- Cross-contract interactions with dependencies

! content end

! content empty

---

! content

## Implementation Guidelines

! anchor implementation-guidelines

When building applications for pod's fast path:

### Design Principles

#### Embrace Uncertainty

- Design for time windows, not exact order
- Handle temporary ordering uncertainty

#### Independent Operations

- Minimize dependencies between transactions
- Design commutative operations where possible
- Use owner-based sequencing

! content end

! content empty

---

! content

## Conclusion

! anchor conclusion

By allowing validators to operate independently and embracing temporal flexibility, pod achieves high performance for compatible operations. Understanding these principles is crucial for designing efficient applications on pod.

! content end

! content empty