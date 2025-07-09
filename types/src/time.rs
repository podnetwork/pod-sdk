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
    Clone,
    Copy,
    Debug,
    PartialEq,
    Eq,
    PartialOrd,
    Ord,
    Serialize,
    Deserialize,
    std::hash::Hash,
    Default,
)]
#[cfg_attr(feature = "arbitrary", derive(arbitrary::Arbitrary))]
pub struct Timestamp(u128);

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
