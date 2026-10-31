# pod-types fuzzing

libFuzzer targets (via [cargo-fuzz](https://github.com/rust-fuzz/cargo-fuzz), nightly-only)
for the encode/decode/parsing surfaces and the merkle tree implementation of `pod-types`.

```sh
cargo install cargo-fuzz
cd types
cargo +nightly fuzz list
cargo +nightly fuzz run merkle_verify                    # fuzz until stopped
cargo +nightly fuzz run merkle_verify -- -max_total_time=60
```

This crate is intentionally its own workspace so the nightly-only fuzz targets
don't participate in normal workspace builds.

## Targets

| Target | Surface | Properties checked |
|---|---|---|
| `merkle_build_prove` | `MerkleTree`, `StandardMerkleTree` | build/proof generation never panics; every leaf's proof verifies; proofs don't verify for other leaves; multiproofs over any unique-leaf subset verify (keccak collisions assumed impossible) |
| `merkle_proof_soundness` | proof/multiproof generate→verify | generated proofs and multiproofs verify; corrupted path elements, truncated/extended paths, flipped flags, dropped/added leaves, and arbitrary garbage proofs are all rejected (keccak collisions assumed impossible) |
| `merkle_verify` | `verify_proof`, `verify_multi_proof` | fully adversarial proofs never panic (proofs arrive over RPC) |
| `transaction_decode` | `Transaction::decode_unsigned` | raw bytes never panic; whatever decodes survives re-encode/re-decode unchanged |
| `transaction_roundtrip` | tagged + bare-legacy RLP | encode∘decode is the identity for every valid `Transaction` |
| `signed_tx_serde` | `Signed<Transaction>` serde | JSON + bincode round-trips; signer recovery matches the original signer |
| `signed_tx_deserialize` | `Signed<Transaction>` deserializers | arbitrary JSON/bincode bytes error gracefully (incl. signature recovery on garbage) |
| `receipt_serde` | `Receipt` serde + merkleization | JSON + bincode round-trips; all log proofs/multiproofs verify against the receipt root |
| `timestamp_parse` | `Timestamp::from_hex_seconds_str` | arbitrary strings never panic; hex seconds round-trip exactly |
| `pagination_cursor` | cursor base64 decode | arbitrary cursors handled gracefully; well-formed cursors round-trip |
| `calldata_serde` | `CallData` hex/bytes serde | arbitrary input never panics; sub-4-byte calldata rejected at every boundary; accessors exercised on every constructible value (incl. deserialized-from-garbage); valid calldata round-trips |
| `log_filter_serde` | `LogFilter` JSON | arbitrary JSON never panics; accepted filters re-serialize idempotently |

## Bugs found so far

- `MerkleTree::verify_multi_proof` panicked (`stack.remove(0)` on an empty vec)
  on malformed proofs that pass the up-front count checks — remote DoS via
  untrusted proofs. Fixed with emptiness guards returning `false`.
- `Receipt::generate_multi_proof_for_log_hashes` panicked for **any** receipt
  with at least one log: `join_prefix` produced `log_hashes.[0]` while the tree
  was built with `log_hashes[0]`. Fixed by attaching index segments without a
  separator in `join_prefix`.

Both have regression tests in the main crate.
