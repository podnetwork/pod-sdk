use std::{
    fmt::Display,
    ops::{Add, Sub},
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use anyhow::{anyhow, Error};
use serde::{Deserialize, Serialize};

#[derive(Debug)]
pub enum TimestampError {
    InvalidHexString,
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

    pub fn from_hex_seconds_str(s: &str) -> Result<Self, Error> {
        if s == "earliest" {
            Ok(Self::zero())
        } else if s == "latest" || s == "finalized" || s == "pending" {
            // todo revisit the pending
            Ok(Self::now())
        } else {
            Ok(Self::from_seconds(
                u64::from_str_radix(s.strip_prefix("0x").unwrap_or(s), 16)
                    .map_err(|_| anyhow!("Invalid timestamp. Expected a hex string"))?,
            ))
        }
    }
}

impl Display for Timestamp {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
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
        Timestamp::from_micros(
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("Time went backwards")
                .as_micros(),
        )
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
