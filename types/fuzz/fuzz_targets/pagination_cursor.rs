//! Fuzz pagination cursor decoding: arbitrary cursors (client-controlled) must
//! be handled gracefully, and cursors encoded the way `serialize_cursor` does
//! (base64 of "start|end") must decode back to the same start/end.
#![no_main]

use arbitrary::Arbitrary;
use base64::Engine;
use libfuzzer_sys::fuzz_target;
use pod_types::pagination::{CursorPagination, CursorPaginationRequest, DEFAULT_QUERY_LIMIT};

#[derive(Arbitrary, Debug)]
struct Input {
    cursor: Option<String>,
    limit: Option<usize>,
    newest_first: Option<bool>,
    start: String,
    end: String,
}

fuzz_target!(|input: Input| {
    let request = CursorPaginationRequest::new(input.cursor, input.limit, input.newest_first);
    let _ = CursorPagination::try_from(request);

    // '|' is the separator, so start/end containing it can't round-trip.
    if !input.start.contains('|') && !input.end.contains('|') {
        let encoded = base64::engine::general_purpose::STANDARD
            .encode(format!("{}|{}", input.start, input.end));
        let request = CursorPaginationRequest::new(Some(encoded), None, None);
        let pagination = CursorPagination::try_from(request).expect("valid cursor must decode");
        assert_eq!(pagination.cursor_start.as_deref(), Some(input.start.as_str()));
        assert_eq!(pagination.cursor_end.as_deref(), Some(input.end.as_str()));
        assert_eq!(pagination.limit, DEFAULT_QUERY_LIMIT);
    }
});
