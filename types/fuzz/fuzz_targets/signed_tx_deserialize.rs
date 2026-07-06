//! Deserializing attacker-controlled bytes into `Signed<Transaction>` (both
//! JSON and bincode, as used for committee proofs / detailed receipts) must
//! error gracefully, never panic. Signature recovery runs on whatever garbage
//! parses, so this also exercises `recover_signer` on arbitrary signatures.
#![no_main]

use bincode::config::standard;
use libfuzzer_sys::fuzz_target;
use pod_types::{Signed, Transaction};

fuzz_target!(|data: &[u8]| {
    let _ = serde_json::from_slice::<Signed<Transaction>>(data);
    // Cap allocations: bincode's serde bridge preallocates the claimed
    // sequence length, so an unlimited config lets a few bytes demand GBs.
    // (Anything decoding untrusted bincode should set a limit like this.)
    let config = standard().with_limit::<{ 1 << 20 }>();
    let _ = bincode::serde::decode_from_slice::<Signed<Transaction>, _>(data, config);
});
