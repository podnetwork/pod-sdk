---
layout: simple
---

! content id="security-considerations"

## Security Considerations

When developing applications using the pod Rust SDK:

1. Never expose private keys or sensitive credentials in your application code.
2. Verify transaction receipts and attestations before considering transactions final.
3. Implement appropriate timeouts and circuit breakers for network operations.
4. Monitor and log suspicious activity or unexpected errors.

! content end

! content empty
