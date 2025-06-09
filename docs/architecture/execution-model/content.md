---
title: Execution Model
layout: simple

url: /architecture/execution-model

toc:
  introduction: Introduction
  state-independence: State Independence
  supported-operations: Supported Operations
  current-limitations: Current Limitations
  available-context: Available Context
  transaction-parameters: Transaction Parameters
  event-driven-architecture: Event-Driven Architecture
  data-processing: Data Processing
  event-design: Event Design
  input-validation: Input Validation
  error-handling: Error Handling
  future-development: Future Development
  conclusion: Conclusion
---

! content

# Execution Model

This page explains what kind of contracts can be deployed and executed on pod, apart from native token transfers.

## Introduction

! anchor introduction

This document describes the execution model of pod network, focusing on its current capabilities, limitations, and best practices for developers. Pod's execution model is designed to maintain high performance and leverage its unique weak consensus properties while ensuring reliable transaction processing.

! content end

! content empty

---

! content

## Core Concepts

### State Independence

! anchor state-independence

Pod currently supports deploying EVM-compatible smart contracts with restrictions that maximize performance and maintain weak consensus guarantees. These constraints shape how developers must approach contract development on pod.

### Supported Operations

! anchor supported-operations

- Transaction input processing
- Access to validator-provided information (block context)
- Event emission
- Reading transaction data (msg context)

### Current Limitations

! anchor current-limitations

- No persistent storage modifications
- No cross-contract calls

### Available Context

! anchor available-context

Contracts deployed on pod have access to:

#### Transaction Context

| Field        | Description                |
| ------------ | -------------------------- |
| `msg.sender` | Transaction sender address |
| `msg.value`  | Transaction value in wei   |
| `msg.data`   | Transaction input data     |
| `msg.sig`    | Function selector          |

#### Block Context

| Field             | Description                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| `block.timestamp` | Local timestamp according to the view of the replica executing the transaction. Read more about timestamps on pod. |

> No other block properties.

#### Transaction Parameters

! anchor transaction-parameters

| Field         | Description                                                   |
| ------------- | ------------------------------------------------------------- |
| `tx.gasprice` | Gas price as set on the transaction                           |
| `tx.origin`   | Supplied for backwards-compatibility, but should not be used. |

> Pod does not have blocks, so there is no access to block properties like block.number, or functions related to blocks, e.g. blockhash

! content end

! content empty

---

! content

## Implementation Patterns

### Event-Driven Architecture

! anchor event-driven-architecture

Since contracts cannot maintain state, applications should be designed around events

! content end

! content

! sticky

! codeblock title="Event-Driven Architecture"

```rust
contract EventLogger {
    event LogData(
        address indexed sender,
        uint256 timestamp,
        bytes data
    );

    function log(bytes calldata data) external {
        emit LogData(
            msg.sender,
            block.timestamp,
            data
        );
    }
}
```

! codeblock end

! sticky end

! content end

---

! content

### Data Processing

! anchor data-processing

Contracts can process input data and emit results

! content end

! content

! sticky

! codeblock title="Data Processing"

```rust
contract DataProcessor {
    event ProcessedResult(
        address indexed sender,
        uint256 result
    );

    function process(uint256[] calldata inputs) external {
        uint256 result = 0;
        for(uint i = 0; i < inputs.length; i++) {
            result += inputs[i];
        }
        emit ProcessedResult(msg.sender, result);
    }
}
```

! codeblock end

! sticky end

! content end

---

! content

### Application Architecture Guidelines

- Use events to record all important information
- Design event structures to capture necessary data
- Index relevant fields for efficient querying

! content end

! content empty

---

! content

## Best Practices

### Event Design

! anchor event-design

Design events to capture complete information

! content end

! content

! sticky

! codeblock title="Event Design"

```rust
event CompleteLog(
    address indexed sender,
    uint256 indexed category,
    uint256 timestamp,
    bytes32 reference,
    bytes data
);
```

! codeblock end

! sticky end

! content end

---

! content

### Input Validation

! anchor input-validation

Implement thorough input validation

! content end

! content

! sticky

! codeblock title="Input Validation"

```rust
function processInput(uint256[] calldata data) external {
    require(data.length > 0, "Empty input");
    require(data.length <= 1000, "Input too large");

    for(uint i = 0; i < data.length; i++) {
        require(data[i] != 0, "Zero value not allowed");
    }

    // Process data...
}
```

! codeblock end

! sticky end

! content end

---

! content

### Error Handling

! anchor error-handling

Use descriptive error messages and custom errors

! content end

! content

! sticky

! codeblock title="Error Handling"

```rust
error InvalidInput(string reason);
error ProcessingFailed(uint256 errorCode);

function validate(bytes calldata input) external {
    if (input.length == 0) {
        revert InvalidInput("Empty input");
    }
    // Additional validation...
}
```

! codeblock end

! sticky end

! content end

---

! content

### Future Development

! anchor future-development

The current execution model represents an initial phase of pod's development. We are working on EVMx the next state of pod's execution model that will allow for:

**Stateful Contracts**

- Immutable state
- Single-owned state
- Shared state

**Cross-Contract Interactions**

- Contract-to-contract calls
- Composability

While still being able to execute the transactions on pod's fast finality.

! content end

! content empty

---

! content

## Conclusion

! anchor conclusion

Pod's execution model is designed for high performance and reliability while maintaining important security guarantees. By understanding and working within these constraints, developers can build efficient and reliable applications on pod.

! content end

! content empty
