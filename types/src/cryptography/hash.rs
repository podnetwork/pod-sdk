use crate::Timestamp;
use alloy_primitives::Address;
pub use alloy_primitives::{B256 as Hash, keccak256 as hash};
use bytes::Bytes;
use std::hash::{DefaultHasher, Hash as StdHash, Hasher};

pub trait Hashable {
    fn hash_custom(&self) -> Hash;
}

impl Hashable for Vec<u8> {
    fn hash_custom(&self) -> Hash {
        hash(self)
    }
}

impl Hashable for Bytes {
    fn hash_custom(&self) -> Hash {
        hash(self)
    }
}

impl Hashable for Address {
    fn hash_custom(&self) -> Hash {
        hash(self.0)
    }
}

impl Hashable for u128 {
    fn hash_custom(&self) -> Hash {
        hash(self.to_be_bytes())
    }
}

impl Hashable for Timestamp {
    fn hash_custom(&self) -> Hash {
        hash(self.as_micros().to_be_bytes())
    }
}

impl Hashable for (u128, Timestamp) {
    fn hash_custom(&self) -> Hash {
        let mut bytes = [0u8; 32];
        bytes[..16].copy_from_slice(&self.0.to_be_bytes());
        bytes[16..].copy_from_slice(&self.1.as_micros().to_be_bytes());
        hash(bytes)
    }
}

pub fn std_hash<H: StdHash>(h: H) -> u64 {
    let mut hasher = DefaultHasher::new();
    h.hash(&mut hasher);
    hasher.finish()
}
