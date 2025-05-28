! content id="pod-caveats"

## 🧠 pod caveats

### Execution Model in pod network

The pod execution environment does not guarantee a total order of transactions signed by different signers. Instead:

- Transactions signed by the same signer are strictly ordered via their nonce.
- Transactions signed by different signers may be executed in different orders on different validators, leading to
  temporary state divergence across the network.

This property can lead to the following behavior in the context of the `Notary` contract:

- If multiple users simultaneously attempt to timestamp the same document with different timestamps, validators might
  execute these transactions in different orders.
- Consequently, different validators may temporarily hold different `timestamps[documentHash]` values depending on
  execution order.

### Consistency Mechanism

Despite this temporary divergence, pod ensures eventual consistency:

- As all validators eventually process the same set of transactions, the state converges to a single consistent result.
- The contract is designed to accommodate this by always applying the minimum timestamp, ensuring that final state
  across validators aligns.

### Attestation vs. Execution

The `requireTimeBefore` function executes only during the attestation stage, not during execution:

- **Attestation Stage**: Ensures the timestamp is in the future at the time of submission. The transaction is decided to
  be valid in the eyes of each validator separately and signed, making it eligible for execution in the second stage.
- **Execution Stage**: The contract updates state without re-checking `requireTimeBefore`. This is intentional so that
  all validators execute the transaction if the quorum attested its validity **no matter when the transaction is
  actually executed**.

### Security Considerations

- This contract does not validate ownership of the document.
- Users could timestamp arbitrary data, so clients must verify document authenticity through external means.

! content end

! content empty
