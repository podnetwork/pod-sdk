//! Fuzz `LogFilter` JSON deserialization (the eth_getLogs-style RPC filter):
//! arbitrary JSON must never panic, and any filter we accept must re-serialize
//! and parse back to an equivalent filter.
//!
//! Timestamps are compared at seconds granularity: "latest"/"pending" parse to
//! `Timestamp::now()` with microsecond precision, but serialization emits whole
//! hex seconds by design.
#![no_main]

use libfuzzer_sys::fuzz_target;
use pod_types::LogFilter;

fuzz_target!(|data: &[u8]| {
    let Ok(filter) = serde_json::from_slice::<LogFilter>(data) else {
        return;
    };

    let json = serde_json::to_string(&filter).expect("accepted filter must serialize");
    let reparsed: LogFilter = serde_json::from_str(&json).expect("serialized filter must parse");

    assert_eq!(filter.address, reparsed.address);
    assert_eq!(filter.topics, reparsed.topics);
    assert_eq!(filter.min_attestations, reparsed.min_attestations);
    assert_eq!(filter.limit, reparsed.limit);
    assert_eq!(filter.from.as_seconds(), reparsed.from.as_seconds());
    assert_eq!(
        filter.to.map(|t| t.as_seconds()),
        reparsed.to.map(|t| t.as_seconds())
    );

    // Serialization must be stable from the second cycle on.
    let json2 = serde_json::to_string(&reparsed).expect("reserialize");
    assert_eq!(json, json2, "serialization must be idempotent");
});
