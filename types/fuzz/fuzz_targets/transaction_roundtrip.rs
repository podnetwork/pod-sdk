//! Structure-aware round-trip: any valid `Transaction`, encoded in the tagged
//! form pod's persistence layer writes (type byte + RLP), must decode back to
//! an identical value. Bare (untagged) legacy RLP must also be accepted.
#![no_main]

use alloy_rlp::Encodable;
use libfuzzer_sys::fuzz_target;
use pod_types::Transaction;

fuzz_target!(|tx: Transaction| {
    let mut encoded = Vec::new();
    match &tx {
        Transaction::Legacy(t) => {
            encoded.push(0x00);
            t.encode(&mut encoded);
        }
        Transaction::Eip1559(t) => {
            encoded.push(0x02);
            t.encode(&mut encoded);
        }
    }

    let mut buf = encoded.as_slice();
    let decoded = Transaction::decode_unsigned(&mut buf).expect("valid tx must decode");
    assert!(buf.is_empty(), "decode must consume the whole buffer");
    assert_eq!(tx, decoded, "tagged round-trip must be lossless");

    // Legacy transactions are also accepted bare, without the type byte.
    if let Transaction::Legacy(t) = &tx {
        let mut bare = Vec::new();
        t.encode(&mut bare);
        let mut buf = bare.as_slice();
        let decoded = Transaction::decode_unsigned(&mut buf).expect("bare legacy must decode");
        assert_eq!(tx, decoded, "bare legacy round-trip must be lossless");
    }
});
