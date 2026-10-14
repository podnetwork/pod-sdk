//! Structure-aware round-trip of `Signed<Transaction>` through JSON and
//! bincode. Deserialization re-derives the signer by signature recovery, so a
//! correct round-trip also proves recovery matches the original signer.
#![no_main]

use bincode::config::standard;
use libfuzzer_sys::fuzz_target;
use pod_types::{Signed, Transaction};

fuzz_target!(|signed: Signed<Transaction>| {
    let json = serde_json::to_string(&signed).expect("JSON serialization must succeed");
    let from_json: Signed<Transaction> =
        serde_json::from_str(&json).expect("own JSON must deserialize");
    assert_eq!(signed.signed, from_json.signed);
    assert_eq!(signed.signature, from_json.signature);
    assert_eq!(signed.signer, from_json.signer, "recovered signer must match");

    let bytes = bincode::serde::encode_to_vec(&signed, standard()).expect("bincode encode");
    let (from_bin, consumed): (Signed<Transaction>, usize) =
        bincode::serde::decode_from_slice(&bytes, standard()).expect("own bincode must decode");
    assert_eq!(consumed, bytes.len(), "decode must consume the whole buffer");
    assert_eq!(signed.signed, from_bin.signed);
    assert_eq!(signed.signature, from_bin.signature);
    assert_eq!(signed.signer, from_bin.signer, "recovered signer must match");
});
