//! Fuzz `Timestamp::from_hex_seconds_str`: arbitrary strings must parse or
//! error, never panic; hex-formatted seconds must round-trip exactly (with and
//! without the 0x prefix).
#![no_main]

use arbitrary::Arbitrary;
use libfuzzer_sys::fuzz_target;
use pod_types::Timestamp;

#[derive(Arbitrary, Debug)]
struct Input {
    s: String,
    seconds: u64,
}

fuzz_target!(|input: Input| {
    let _ = Timestamp::from_hex_seconds_str(&input.s);

    let expected = Timestamp::from_seconds(input.seconds);
    let plain = format!("{:x}", input.seconds);
    assert_eq!(Timestamp::from_hex_seconds_str(&plain), Ok(expected));
    let prefixed = format!("0x{:x}", input.seconds);
    assert_eq!(Timestamp::from_hex_seconds_str(&prefixed), Ok(expected));
});
