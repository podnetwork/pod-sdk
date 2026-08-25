# Timestamping

Timestamping allows applications to make progress based on a global time reference - for example, terminating an auction at a deadline or pricing gas based on network congestion over a given interval.

Pod provides two sources of timestamps, both with microsecond precision:

1. **Transaction timestamps** - each validator signs a local microsecond timestamp when attesting to a transaction.
2. **Vote batch timestamps** - each validator signs every vote batch it broadcasts, and each batch carries a microsecond timestamp and a sequence number. A validator with nothing to attest to still emits a batch with no votes in it, so time keeps advancing on an idle network. Vote batches are sequenced in the validator's temporal log alongside transactions.

Both timestamps, combined with the sequence numbers in each validator's temporal log, allow the network to make time-based arguments about transactions.

## Past Perfection

Applications can subscribe to a **time of interest** - for example, an auction deadline - using `pod_subscribe`. The time of interest is reached when a quorum (n - f) of validators have signed vote batches with timestamps beyond it. At that point, the full node returns a **past perfect set** associated with that timestamp.

The past perfect set provides four properties:

1. **The time has passed** - the network has moved beyond the subscribed timestamp. Applications that need to trigger an action after a certain time (e.g. closing an auction) can rely on this.
2. **Completeness** - the past perfect set contains all transactions that could have received n - f attestations with a timestamp less than the subscribed timestamp. No additional transactions can appear (as finalized) with an earlier timestamp after the set is returned.
3. **Authenticity** - every transaction in the past perfect set was attested by at least f + 1 honest validators with a timestamp before the subscribed time. This guarantees the set only contains transactions that were genuinely submitted in time.
4. **Censorship resistance** - if a transaction was submitted sufficiently before the time of interest, it is guaranteed to be included in the past perfect set. This ensures that validators cannot selectively exclude timely transactions from the set.

## Past Perfect Certificate

The quorum of vote signatures that establishes past perfection forms a **past perfect certificate**. This certificate is verifiable outside Pod - a smart contract on Ethereum, a TEE enclave, or a ZK circuit can check the n - f vote signatures to independently confirm the set is final.
