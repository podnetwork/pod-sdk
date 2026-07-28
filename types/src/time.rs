use std::{
    fmt::Display,
    ops::{Add, Sub},
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};

#[derive(Debug, thiserror::Error, Clone, PartialEq, Eq)]
pub enum TimestampError {
    #[error(r#"invalid hex string "{0}": can't convert to Timestamp"#)]
    InvalidHexString(String),
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Serialize, std::hash::Hash, Default,
)]
#[cfg_attr(feature = "arbitrary", derive(arbitrary::Arbitrary))]
pub struct Timestamp(u128);

/// `Deserialize` is hand-written, not derived, so a `Timestamp` still decodes
/// when the deserializer buffers fields before handing them over.
/// `#[serde(flatten)]`, `#[serde(untagged)]` and internally-tagged enums all
/// route every field through serde's `Content` type, which has no `u128` variant
/// and rejects the derived newtype impl outright with "u128 is not supported" —
/// the failure that broke the `pod_getVoteBatches` `Plain` pull.
///
/// Only human-readable formats take the new path: `deserialize_any` accepts the
/// integer the buffer actually holds (JSON numbers arrive as `u64`), plus a
/// decimal string so a producer that switches to string-encoded micros stays
/// readable. Binary formats are not self-describing — `deserialize_any` is
/// unsupported there — so they keep the derived behaviour exactly, byte for
/// byte, which is what keeps existing bincode payloads and MessagePack snapshots
/// loadable.
impl<'de> Deserialize<'de> for Timestamp {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        if deserializer.is_human_readable() {
            return deserializer.deserialize_any(TimestampVisitor);
        }
        deserializer.deserialize_newtype_struct("Timestamp", TimestampVisitor)
    }
}

struct TimestampVisitor;

impl<'de> serde::de::Visitor<'de> for TimestampVisitor {
    type Value = Timestamp;

    fn expecting(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        f.write_str("microseconds since the Unix epoch, as an integer or a decimal string")
    }

    /// The binary path: mirrors the derived newtype impl.
    fn visit_newtype_struct<D>(self, deserializer: D) -> Result<Timestamp, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        u128::deserialize(deserializer).map(Timestamp)
    }

    fn visit_u64<E>(self, v: u64) -> Result<Timestamp, E> {
        Ok(Timestamp(u128::from(v)))
    }

    fn visit_u128<E>(self, v: u128) -> Result<Timestamp, E> {
        Ok(Timestamp(v))
    }

    fn visit_i64<E: serde::de::Error>(self, v: i64) -> Result<Timestamp, E> {
        u128::try_from(v)
            .map(Timestamp)
            .map_err(|_| E::custom(format!("negative timestamp: {v}")))
    }

    fn visit_i128<E: serde::de::Error>(self, v: i128) -> Result<Timestamp, E> {
        u128::try_from(v)
            .map(Timestamp)
            .map_err(|_| E::custom(format!("negative timestamp: {v}")))
    }

    fn visit_str<E: serde::de::Error>(self, v: &str) -> Result<Timestamp, E> {
        v.parse().map(Timestamp).map_err(E::custom)
    }
}

impl Timestamp {
    pub const MAX: Timestamp = Timestamp(u128::MAX);

    pub fn zero() -> Self {
        Timestamp(0)
    }

    pub fn as_micros(&self) -> u128 {
        self.0
    }

    pub fn as_seconds(&self) -> u128 {
        self.0 / 1_000_000
    }

    pub fn from_micros(micros: u128) -> Self {
        Timestamp(micros)
    }

    pub fn from_seconds(seconds: u64) -> Self {
        Timestamp(u128::from(seconds) * 1_000_000)
    }

    pub fn now() -> Self {
        SystemClock.now()
    }

    pub fn from_hex_seconds_str(s: &str) -> Result<Self, TimestampError> {
        match s {
            "earliest" => Ok(Self::zero()),
            "latest" | "finalized" => Ok(Self::now()),
            // TODO: revisit the pending
            "pending" => {
                tracing::warn!(
                    "Using 'pending' as a timestamp isn't properly implemented. Using current time."
                );
                Ok(Self::now())
            }
            s => Ok(Self::from_seconds(
                u64::from_str_radix(s.strip_prefix("0x").unwrap_or(s), 16)
                    .map_err(|_| TimestampError::InvalidHexString(s.to_string()))?,
            )),
        }
    }
}

impl Display for Timestamp {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl From<SystemTime> for Timestamp {
    fn from(value: SystemTime) -> Self {
        Timestamp::from_micros(
            value
                .duration_since(UNIX_EPOCH)
                .expect("Time went backwards")
                .as_micros(),
        )
    }
}

impl From<Timestamp> for SystemTime {
    fn from(value: Timestamp) -> Self {
        UNIX_EPOCH + Duration::from_micros(value.as_micros() as u64)
    }
}

impl Sub<Duration> for Timestamp {
    type Output = Timestamp;

    fn sub(self, rhs: Duration) -> Self::Output {
        Timestamp(self.0 - rhs.as_micros())
    }
}

impl Sub<Timestamp> for Timestamp {
    type Output = Timestamp;

    fn sub(self, rhs: Timestamp) -> Self::Output {
        Timestamp::from_micros(self.0 - rhs.0)
    }
}

impl Add<Duration> for Timestamp {
    type Output = Timestamp;

    fn add(self, rhs: Duration) -> Self::Output {
        Timestamp(self.0 + rhs.as_micros())
    }
}
pub trait Clock {
    fn now(&self) -> Timestamp;
}

#[derive(Clone)]
pub struct SystemClock;

impl Clock for SystemClock {
    fn now(&self) -> Timestamp {
        SystemTime::now().into()
    }
}

pub struct MockClock {
    time: Timestamp,
}

impl MockClock {
    pub fn new(time: Timestamp) -> Self {
        Self { time }
    }

    pub fn set_time(&mut self, time: Timestamp) {
        self.time = time;
    }

    pub fn advance(&mut self, duration: Duration) {
        self.time = self.time + duration;
    }
}

impl Clock for MockClock {
    fn now(&self) -> Timestamp {
        self.time
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const MICROS: u128 = 1_718_900_000_000_000;

    /// A `Timestamp` nested behind `#[serde(flatten)]` inside an internally
    /// tagged enum — the shape that buffers every field through serde's
    /// `Content` and used to fail with "u128 is not supported".
    #[derive(Debug, PartialEq, Serialize, Deserialize)]
    struct Inner {
        a: u32,
    }

    #[derive(Debug, PartialEq, Serialize, Deserialize)]
    #[serde(tag = "type", rename_all = "lowercase")]
    enum Buffered {
        V {
            #[serde(flatten)]
            inner: Inner,
            ts: Timestamp,
        },
    }

    #[test]
    fn json_round_trips_plain_and_through_a_buffering_deserializer() {
        // Plain: unchanged from the derived impl — a bare number.
        let json = serde_json::to_string(&Timestamp::from_micros(MICROS)).unwrap();
        assert_eq!(json, MICROS.to_string());
        assert_eq!(
            serde_json::from_str::<Timestamp>(&json)
                .unwrap()
                .as_micros(),
            MICROS
        );

        // Buffered: flatten + internally tagged. The wire bytes are the same
        // bare number; only decoding was broken before.
        let value = Buffered::V {
            inner: Inner { a: 1 },
            ts: Timestamp::from_micros(MICROS),
        };
        let json = serde_json::to_string(&value).unwrap();
        assert!(
            json.contains(&format!(r#""ts":{MICROS}"#)),
            "unchanged encoding: {json}"
        );
        assert_eq!(serde_json::from_str::<Buffered>(&json).unwrap(), value);
    }

    /// Micros as a decimal string decode too, so a producer that switches to
    /// string-encoded timestamps stays readable.
    #[test]
    fn json_accepts_micros_as_a_decimal_string() {
        let ts: Timestamp = serde_json::from_str(&format!(r#""{MICROS}""#)).unwrap();
        assert_eq!(ts.as_micros(), MICROS);
    }

    #[test]
    fn json_rejects_a_negative_timestamp() {
        assert!(serde_json::from_str::<Timestamp>("-1").is_err());
    }

    /// Binary formats are not self-describing, so they keep the derived
    /// behaviour: same bytes in, same value out. This is what keeps existing
    /// bincode payloads (and MessagePack snapshots) loadable.
    #[test]
    fn bincode_round_trips_unchanged() {
        let cfg = bincode::config::standard();
        let ts = Timestamp::from_micros(MICROS);
        let bytes = bincode::serde::encode_to_vec(ts, cfg).unwrap();
        let (decoded, _): (Timestamp, _) = bincode::serde::decode_from_slice(&bytes, cfg).unwrap();
        assert_eq!(decoded, ts);

        // Nested in a struct, which is how attestations carry it.
        #[derive(Debug, PartialEq, Serialize, Deserialize)]
        struct Carrier {
            ts: Timestamp,
            other: u64,
        }
        let carrier = Carrier { ts, other: 7 };
        let bytes = bincode::serde::encode_to_vec(&carrier, cfg).unwrap();
        let (decoded, _): (Carrier, _) = bincode::serde::decode_from_slice(&bytes, cfg).unwrap();
        assert_eq!(decoded, carrier);
    }
}
