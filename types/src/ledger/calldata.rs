use bytes::Bytes;
use serde::{Deserialize, Serialize};

use crate::{Hashable, Merkleizable, cryptography::merkle_tree::MerkleBuilder};

#[derive(Clone, Serialize, Deserialize, Debug, PartialEq, Eq, std::hash::Hash)]
pub struct CallData(
    #[serde(
        serialize_with = "serialize_bytes_as_hex",
        deserialize_with = "deserialize_bytes_as_hex"
    )]
    Bytes,
);

impl CallData {
    /// Creates a new `CallData` instance, ensuring it has at least 4 bytes.
    pub fn new(data: Bytes) -> Self {
        // Calldata must have at least 4 bytes (first 4 bytes of keccak256 hash of function sig)
        assert!(data.len() >= 4, "CallData must contain at least 4 bytes");
        CallData(data)
    }

    // Get calldata as a slice
    pub fn as_slice(&self) -> &[u8] {
        &self.0[..]
    }

    // Get calldata as bytes
    pub fn as_bytes(&self) -> &Bytes {
        &self.0
    }

    pub fn empty() -> Self {
        // Returns a `CallData` instance containing 1 zero byte.
        CallData(Bytes::from(vec![]))
    }

    /// Converts the internal bytes to a hexadecimal string.
    pub fn to_hex_string(&self) -> String {
        let mut result = String::with_capacity(self.0.len() * 2);
        for &byte in self.0.iter() {
            result.push_str(&format!("{:02x}", byte));
        }
        result
    }

    /// Returns the first 4 bytes encoding the function to be called as an array
    pub fn get_function_bytes(&self) -> [u8; 4] {
        [self.0[0], self.0[1], self.0[2], self.0[3]]
    }

    /// Returns the calldata not including the function signature hash bytes
    pub fn get_body(&self) -> &[u8] {
        &self.0[4..]
    }
}

impl Merkleizable for CallData {
    fn append_leaves(&self, builder: &mut MerkleBuilder) {
        builder.add_field("calldata", self.0.hash_custom());
    }
}

fn serialize_bytes_as_hex<S>(data: &Bytes, serializer: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    // checks if serializer is human-readable or not
    if serializer.is_human_readable() {
        serializer.serialize_str(&hex::encode(data))
    } else {
        serializer.serialize_bytes(data)
    }
}

// equivalently, deserialize according to human-readable or not
fn deserialize_bytes_as_hex<'de, D>(deserializer: D) -> Result<Bytes, D::Error>
where
    D: serde::Deserializer<'de>,
{
    // check if deserializer human readable or not
    if deserializer.is_human_readable() {
        let s = String::deserialize(deserializer)?;
        Ok(Bytes::from(
            hex::decode(s).map_err(serde::de::Error::custom)?,
        ))
    } else {
        Ok(Bytes::deserialize(deserializer)?)
    }
}
