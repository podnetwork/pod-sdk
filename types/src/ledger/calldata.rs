use bytes::Bytes;
use serde::{Deserialize, Serialize, Serializer};

use crate::{Hashable, Merkleizable, cryptography::merkle_tree::MerkleBuilder};

/// Contract-call calldata: a 4-byte function selector followed by the
/// ABI-encoded arguments. The selector is part of the type, so calldata
/// shorter than 4 bytes is unrepresentable and the accessors can't panic.
///
/// Wire format (serde) is the full `selector ++ body` blob: a hex string for
/// human-readable formats, raw bytes otherwise.
#[derive(Clone, Debug, PartialEq, Eq, std::hash::Hash)]
pub struct CallData {
    /// First 4 bytes of the keccak256 hash of the function signature.
    selector: [u8; 4],
    /// ABI-encoded arguments following the selector.
    body: Bytes,
}

#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
#[error("calldata must contain at least the 4 function selector bytes, got {0} bytes")]
pub struct CallDataTooShort(pub usize);

impl CallData {
    pub fn new(selector: [u8; 4], body: Bytes) -> Self {
        CallData { selector, body }
    }

    /// The full calldata: selector followed by the body.
    pub fn to_bytes(&self) -> Bytes {
        let mut data = Vec::with_capacity(4 + self.body.len());
        data.extend_from_slice(&self.selector);
        data.extend_from_slice(&self.body);
        Bytes::from(data)
    }

    /// The full calldata as a lowercase hexadecimal string.
    pub fn to_hex_string(&self) -> String {
        hex::encode(self.to_bytes())
    }

    /// Returns the first 4 bytes encoding the function to be called.
    pub fn get_function_bytes(&self) -> [u8; 4] {
        self.selector
    }

    /// Returns the calldata not including the function selector bytes.
    pub fn get_body(&self) -> &[u8] {
        &self.body
    }
}

impl TryFrom<Bytes> for CallData {
    type Error = CallDataTooShort;

    fn try_from(data: Bytes) -> Result<Self, Self::Error> {
        if data.len() < 4 {
            return Err(CallDataTooShort(data.len()));
        }
        Ok(CallData {
            selector: [data[0], data[1], data[2], data[3]],
            body: data.slice(4..),
        })
    }
}

impl Serialize for CallData {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        if serializer.is_human_readable() {
            serializer.serialize_str(&self.to_hex_string())
        } else {
            serializer.serialize_bytes(&self.to_bytes())
        }
    }
}

impl<'de> Deserialize<'de> for CallData {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let bytes = if deserializer.is_human_readable() {
            let s = String::deserialize(deserializer)?;
            Bytes::from(hex::decode(s).map_err(serde::de::Error::custom)?)
        } else {
            Bytes::deserialize(deserializer)?
        };
        CallData::try_from(bytes).map_err(serde::de::Error::custom)
    }
}

impl Merkleizable for CallData {
    fn append_leaves(&self, builder: &mut MerkleBuilder) {
        builder.add_field("calldata", self.to_bytes().hash_custom());
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use bincode::config::standard;

    fn calldata() -> CallData {
        CallData::new([0xde, 0xad, 0xbe, 0xef], Bytes::from(vec![1, 2, 3]))
    }

    #[test]
    fn accessors_match_parts() {
        let calldata = calldata();
        assert_eq!(calldata.get_function_bytes(), [0xde, 0xad, 0xbe, 0xef]);
        assert_eq!(calldata.get_body(), &[1, 2, 3]);
        assert_eq!(calldata.to_hex_string(), "deadbeef010203");
    }

    #[test]
    fn try_from_splits_selector_and_body() {
        let calldata = CallData::try_from(Bytes::from(vec![0xde, 0xad, 0xbe, 0xef, 7])).unwrap();
        assert_eq!(calldata.get_function_bytes(), [0xde, 0xad, 0xbe, 0xef]);
        assert_eq!(calldata.get_body(), &[7]);

        // A bare selector is valid calldata with an empty body.
        let bare = CallData::try_from(Bytes::from(vec![0xde, 0xad, 0xbe, 0xef])).unwrap();
        assert_eq!(bare.get_body(), &[] as &[u8]);
    }

    #[test]
    fn try_from_rejects_short_calldata() {
        assert_eq!(
            CallData::try_from(Bytes::from(vec![0xde, 0xad, 0xbe])),
            Err(CallDataTooShort(3))
        );
        assert_eq!(CallData::try_from(Bytes::new()), Err(CallDataTooShort(0)));
    }

    #[test]
    fn json_roundtrip_as_hex_string() {
        let calldata = calldata();
        let json = serde_json::to_string(&calldata).unwrap();
        assert_eq!(json, r#""deadbeef010203""#);
        let deserialized: CallData = serde_json::from_str(&json).unwrap();
        assert_eq!(calldata, deserialized);
    }

    #[test]
    fn bincode_roundtrip() {
        let calldata = calldata();
        let encoded = bincode::serde::encode_to_vec(&calldata, standard()).unwrap();
        let (deserialized, _): (CallData, usize) =
            bincode::serde::decode_from_slice(&encoded, standard()).unwrap();
        assert_eq!(calldata, deserialized);
    }

    #[test]
    fn deserializing_short_calldata_fails() {
        assert!(serde_json::from_str::<CallData>(r#""deadbe""#).is_err());
        assert!(serde_json::from_str::<CallData>(r#""""#).is_err());

        let short = bincode::serde::encode_to_vec(Bytes::from(vec![1, 2, 3]), standard()).unwrap();
        assert!(bincode::serde::decode_from_slice::<CallData, _>(&short, standard()).is_err());
    }
}
