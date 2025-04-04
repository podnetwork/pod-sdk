use alloy_primitives::Address;
pub use alloy_primitives::{keccak256 as hash, B256 as Hash};
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

pub fn std_hash<H: StdHash>(h: H) -> u64 {
    let mut hasher = DefaultHasher::new();
    h.hash(&mut hasher);
    hasher.finish()
}
