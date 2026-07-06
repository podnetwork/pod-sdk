//! Fuzz `CallData` hex/bytes serde: arbitrary input must never panic the
//! deserializer, and valid calldata must round-trip through JSON (hex string)
//! and bincode (raw bytes), with accessors consistent with the raw payload.
#![no_main]

use arbitrary::Arbitrary;
use bincode::config::standard;
use bytes::Bytes;
use libfuzzer_sys::fuzz_target;
use pod_types::CallData;

#[derive(Arbitrary, Debug)]
struct Input {
    payload: Vec<u8>,
    raw: Vec<u8>,
    text: String,
}

fuzz_target!(|input: Input| {
    // Attacker-controlled input must error gracefully. The bincode config is
    // capped because its serde bridge preallocates the claimed sequence
    // length — unlimited configs let a few bytes demand GBs.
    let _ = serde_json::from_slice::<CallData>(&input.raw);
    let capped = standard().with_limit::<{ 1 << 20 }>();
    let _ = bincode::serde::decode_from_slice::<CallData, _>(&input.raw, capped);
    let json_string = serde_json::to_string(&input.text).expect("string serializes");
    let _ = serde_json::from_str::<CallData>(&json_string);

    // CallData requires at least the 4 selector bytes.
    if input.payload.len() < 4 {
        return;
    }
    let calldata = CallData::new(Bytes::from(input.payload.clone()));
    assert_eq!(calldata.to_hex_string(), hex::encode(&input.payload));
    assert_eq!(calldata.get_function_bytes().as_slice(), &input.payload[..4]);
    assert_eq!(calldata.get_body(), &input.payload[4..]);
    assert_eq!(calldata.as_slice(), input.payload.as_slice());

    let json = serde_json::to_string(&calldata).expect("JSON serialization must succeed");
    let from_json: CallData = serde_json::from_str(&json).expect("own JSON must deserialize");
    assert_eq!(calldata, from_json);

    let bytes = bincode::serde::encode_to_vec(&calldata, standard()).expect("bincode encode");
    let (from_bin, _): (CallData, usize) =
        bincode::serde::decode_from_slice(&bytes, standard()).expect("own bincode must decode");
    assert_eq!(calldata, from_bin);
});
