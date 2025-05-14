use crate::Timestamp;
use alloy_primitives::Address;
pub use alloy_primitives::{keccak256 as hash, B256 as Hash};
use bytes::Bytes;
use std::hash::{DefaultHasher, Hash as StdHash, Hasher};

pub struct DomainDigest {
    pub prefix: &'static [u8],
    pub version: u8,
}

impl DomainDigest {
    pub fn new(prefix: &'static [u8], version: u8) -> DomainDigest {
        Self { prefix, version }
    }
}
pub struct MessageDigest {
    pub domain: DomainDigest,
    pub message: Hash,
}

impl Hashable for MessageDigest {
    fn hash_custom(&self) -> Hash {
        let mut v = Vec::with_capacity(self.domain.prefix.len() + 1 + 32);
        v.extend_from_slice(self.domain.prefix);
        v.push(self.domain.version);
        v.extend_from_slice(self.message.as_slice());

        hash(v.as_slice())
    }
}

impl MessageDigest {
    pub fn new(domain: DomainDigest, message: Hash) -> MessageDigest {
        Self { domain, message }
    }
}

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
