//! Fuzz `CallData`: the type is selector + body, so no reachable value can
//! panic in the accessors — this target calls them on everything it can
//! construct, including values deserialized from garbage. Also checks that
//! sub-4-byte input is rejected at every construction boundary and that valid
//! calldata round-trips through JSON (hex string) and bincode (raw bytes).
#![no_main]

use arbitrary::Arbitrary;
use bincode::config::standard;
use bytes::Bytes;
use libfuzzer_sys::fuzz_target;
use pod_types::CallData;

/// Accessors must be total; exercise them on every value we get our hands on.
fn poke(calldata: &CallData) {
    let selector = calldata.get_function_bytes();
    let body = calldata.get_body();
    let full = calldata.to_bytes();
    assert_eq!(&full[..4], selector.as_slice());
    assert_eq!(&full[4..], body);
    assert_eq!(calldata.to_hex_string(), hex::encode(&full));
}

#[derive(Arbitrary, Debug)]
struct Input {
    selector: [u8; 4],
    body: Vec<u8>,
    raw: Vec<u8>,
    text: String,
}

fuzz_target!(|input: Input| {
    // Attacker-controlled input must error gracefully, and whatever does
    // deserialize is safe to use. The bincode config is capped because its
    // serde bridge preallocates the claimed sequence length.
    let capped = standard().with_limit::<{ 1 << 20 }>();
    if let Ok(calldata) = serde_json::from_slice::<CallData>(&input.raw) {
        poke(&calldata);
    }
    if let Ok((calldata, _)) =
        bincode::serde::decode_from_slice::<CallData, _>(&input.raw, capped)
    {
        poke(&calldata);
    }
    let json_string = serde_json::to_string(&input.text).expect("string serializes");
    if let Ok(calldata) = serde_json::from_str::<CallData>(&json_string) {
        poke(&calldata);
    }

    // TryFrom is the checked boundary: <4 bytes rejected, >=4 split losslessly.
    match CallData::try_from(Bytes::from(input.raw.clone())) {
        Ok(calldata) => {
            poke(&calldata);
            assert_eq!(calldata.to_bytes(), input.raw);
            assert_eq!(calldata.get_function_bytes().as_slice(), &input.raw[..4]);
            assert_eq!(calldata.get_body(), &input.raw[4..]);
        }
        Err(_) => assert!(input.raw.len() < 4, "only short calldata may be rejected"),
    }

    // Structured construction and serde round-trips.
    let calldata = CallData::new(input.selector, Bytes::from(input.body.clone()));
    poke(&calldata);
    assert_eq!(calldata.get_function_bytes(), input.selector);
    assert_eq!(calldata.get_body(), input.body.as_slice());

    let json = serde_json::to_string(&calldata).expect("JSON serialization must succeed");
    let from_json: CallData = serde_json::from_str(&json).expect("own JSON must deserialize");
    assert_eq!(calldata, from_json);

    let bytes = bincode::serde::encode_to_vec(&calldata, standard()).expect("bincode encode");
    let (from_bin, _): (CallData, usize) =
        bincode::serde::decode_from_slice(&bytes, standard()).expect("own bincode must decode");
    assert_eq!(calldata, from_bin);
});
