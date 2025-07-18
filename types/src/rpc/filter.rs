use alloy_primitives::Address;
use alloy_rpc_types::{FilterSet, ValueOrArray};
use serde::{Deserialize, Deserializer, Serialize, Serializer};

use crate::{Timestamp, cryptography::Hash};

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct LogFilter {
    #[serde(
        deserialize_with = "deserialize_address",
        serialize_with = "serialize_address",
        default
    )]
    pub address: FilterSet<Address>,
    #[serde(deserialize_with = "deserialize_topics", default)]
    pub topics: [Option<Hash>; 4],
    #[serde(
        alias = "fromBlock",
        deserialize_with = "deserialize_block_timestamp",
        serialize_with = "serialize_block_timestamp"
    )]
    #[serde(default)]
    pub from: Timestamp,
    #[serde(
        alias = "toBlock",
        deserialize_with = "deserialize_block_timestamp_end",
        serialize_with = "serialize_block_timestamp_end"
    )]
    pub to: Option<Timestamp>,
    #[serde(alias = "minimum_attestations", default)]
    pub min_attestations: u32,
    #[serde(default)]
    pub limit: usize,
}

fn deserialize_address<'de, D>(deserializer: D) -> Result<FilterSet<Address>, D::Error>
where
    D: Deserializer<'de>,
{
    // TODO:Deserialize into FilterSet and check length with .len()
    // after upgrading to alloy 1.0.
    // https://docs.rs/alloy/1.0.9/alloy/rpc/types/struct.FilterSet.html#method.len

    // Deserialize into helper enum
    let input = ValueOrArray::<Address>::deserialize(deserializer)?;

    match &input {
        ValueOrArray::Value(_) => {}
        ValueOrArray::Array(addrs) => {
            if addrs.len() > 4 {
                return Err(serde::de::Error::custom(format!(
                    "max 4 addresses is supported (provided {})",
                    addrs.len()
                )));
            }
        }
    }
    Ok(input.into())
}

fn serialize_address<S>(value: &FilterSet<Address>, serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    if let Some(v) = value.to_value_or_array() {
        v.serialize(serializer)
    } else {
        serializer.serialize_none()
    }
}

fn deserialize_topics<'de, D>(deserializer: D) -> Result<[Option<Hash>; 4], D::Error>
where
    D: Deserializer<'de>,
{
    let opt_vec = Option::<Vec<Option<Hash>>>::deserialize(deserializer)?;
    let mut result = [None; 4];

    if let Some(vec) = opt_vec {
        for (i, topic) in vec.into_iter().take(4).enumerate() {
            result[i] = topic;
        }
    }
    Ok(result)
}

fn deserialize_block_timestamp<'de, D>(deserializer: D) -> Result<Timestamp, D::Error>
where
    D: Deserializer<'de>,
{
    let block_timestamp_str = String::deserialize(deserializer)?;
    let timestamp = Timestamp::from_hex_seconds_str(&block_timestamp_str)
        .map_err(|e| serde::de::Error::custom(e.to_string()))?;

    Ok(timestamp)
}

fn serialize_block_timestamp<S>(value: &Timestamp, serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    serializer.serialize_str(&format!("{:x}", value.as_seconds()))
}

fn deserialize_block_timestamp_end<'de, D>(deserializer: D) -> Result<Option<Timestamp>, D::Error>
where
    D: Deserializer<'de>,
{
    let block_timestamp_str: String = String::deserialize(deserializer)?;

    if block_timestamp_str.is_empty() || block_timestamp_str == "latest" {
        return Ok(None);
    }

    let timestamp = Timestamp::from_hex_seconds_str(&block_timestamp_str)
        .map_err(|e| serde::de::Error::custom(e.to_string()))?;

    Ok(Some(timestamp))
}

fn serialize_block_timestamp_end<S>(
    value: &Option<Timestamp>,
    serializer: S,
) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    match value {
        Some(t) => serialize_block_timestamp(t, serializer),
        None => serializer.serialize_str(""),
    }
}

#[derive(Debug, Default)]
pub struct LogFilterBuilder(LogFilter);

impl LogFilterBuilder {
    #[must_use]
    pub fn new() -> Self {
        Self(LogFilter::default())
    }

    #[must_use]
    pub fn address<T: Into<FilterSet<Address>>>(mut self, address: T) -> Self {
        self.0.address = address.into();
        self
    }

    #[must_use]
    pub fn build(self) -> LogFilter {
        self.0
    }

    #[must_use]
    pub fn from(self, from: Timestamp) -> Self {
        Self(LogFilter { from, ..self.0 })
    }

    #[must_use]
    pub fn to(self, to: Timestamp) -> Self {
        Self(LogFilter {
            to: Some(to),
            ..self.0
        })
    }

    #[must_use]
    pub fn event_signature<H: Into<Hash>>(self, event_signature: H) -> Self {
        self.topic(0, event_signature)
    }

    #[must_use]
    fn topic<H: Into<Hash>>(self, n: usize, topic: H) -> Self {
        assert!(n < 4, "Only 4 topics are supported");
        let mut topics = self.0.topics;
        topics[n] = Some(topic.into());
        Self(LogFilter { topics, ..self.0 })
    }

    #[must_use]
    pub fn topic1<H: Into<Hash>>(self, topic: H) -> Self {
        self.topic(1, topic)
    }

    #[must_use]
    pub fn topic2<H: Into<Hash>>(self, topic: H) -> Self {
        self.topic(2, topic)
    }

    #[must_use]
    pub fn topic3<H: Into<Hash>>(self, topic: H) -> Self {
        self.topic(3, topic)
    }

    #[must_use]
    pub fn min_attestations(self, min_attestations: u32) -> Self {
        Self(LogFilter {
            min_attestations,
            ..self.0
        })
    }

    #[must_use]
    pub fn limit(self, limit: usize) -> Self {
        Self(LogFilter { limit, ..self.0 })
    }
}

impl From<LogFilterBuilder> for LogFilter {
    fn from(builder: LogFilterBuilder) -> Self {
        builder.0
    }
}

#[cfg(test)]
mod tests {
    use std::time::Duration;

    use alloy_primitives::{Address, B256, U256};

    use super::{LogFilter, LogFilterBuilder};
    use crate::Timestamp;

    #[test]
    fn serializing_empty() {
        let filter = LogFilter::default();

        let serialized = serde_json::to_string(&filter).unwrap();

        let deserialized: LogFilter = serde_json::from_str(&dbg!(serialized)).unwrap();

        assert_eq!(filter, deserialized);
    }

    #[test]
    fn serializing_log_filter() {
        let now_seconds = Timestamp::from_seconds(Timestamp::now().as_seconds() as u64);
        let filter = LogFilterBuilder::default()
            .address(
                "0x1234567890123456789012345678901234567890"
                    .parse::<Address>()
                    .unwrap(),
            )
            .event_signature(B256::from(U256::from(111)))
            .topic3(B256::from(U256::from(222)))
            .from(now_seconds)
            .to(now_seconds + Duration::from_secs(1000))
            .min_attestations(77)
            .limit(200)
            .build();

        let serialized = serde_json::to_string(&filter).unwrap();
        let deserialized: LogFilter = serde_json::from_str(&serialized).unwrap();

        assert_eq!(filter, deserialized);
    }
}
