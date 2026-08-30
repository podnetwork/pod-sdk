//! Fuzz `Transaction::decode_unsigned` on raw bytes.
//!
//! Decoding attacker-controlled bytes must never panic, and anything that
//! decodes must survive a re-encode/re-decode cycle unchanged.
#![no_main]

use alloy_rlp::Encodable;
use libfuzzer_sys::fuzz_target;
use pod_types::Transaction;

fn encode_tagged(tx: &Transaction) -> Vec<u8> {
    let mut out = Vec::new();
    match tx {
        Transaction::Legacy(t) => {
            out.push(0x00);
            t.encode(&mut out);
        }
        Transaction::Eip1559(t) => {
            out.push(0x02);
            t.encode(&mut out);
        }
    }
    out
}

fuzz_target!(|data: &[u8]| {
    let mut buf = data;
    let Ok(tx) = Transaction::decode_unsigned(&mut buf) else {
        return;
    };

    let encoded = encode_tagged(&tx);
    let mut rest = encoded.as_slice();
    let tx2 = Transaction::decode_unsigned(&mut rest).expect("re-encoded tx must decode");
    assert!(rest.is_empty(), "re-decode must consume the whole buffer");
    assert_eq!(tx, tx2, "decode must be stable across re-encoding");
});
