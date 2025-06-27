---
layout: single
---

! anchor best-practices

## Best practices

For optimal client usage:

1. Always check for and handle the None case when querying transactions or receipts. the specific error types provided by the SDK for precise error handling.
2. Implement appropriate retry logic and timeouts for handling transient failures.
3. Maintain a single client instance when possible to improve resource utilization.
4. Check attestations when required by your application's security requirements.
