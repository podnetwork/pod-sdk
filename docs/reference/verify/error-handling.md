! content id="error-handling"

## Error Handling

The SDK defines the following standard error conditions

! content end

! content

! sticky

! codeblock title="Conditions"

```rust
error InvalidSignatures();         // Aggregate signature validation failed
error InvalidProof();             // Merkle proof validation failed
error InvalidLogIndex();          // Log index out of bounds
error InvalidGeneralizedIndex();   // Invalid generalized index
error InvalidQuorumSize();        // Invalid committee quorum size
```

! codeblock end

! sticky end

! content end
