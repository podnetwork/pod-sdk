use crate::cryptography::Hash;
use crate::cryptography::hash::hash;
use crate::{Hashable, Timestamp};
use alloy_primitives::{Address, Signature};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TransactionMetadata {
    pub tx_hash: Hash,
    pub timestamp: Timestamp,
    pub sequences: Vec<(Address, u64)>,
    pub tx_signature: Signature,
}

impl Hashable for TransactionMetadata {
    fn hash_custom(&self) -> Hash {
        // 32 (tx_hash) + 16 (timestamp) + N * (20 (addr) + 8 (seq)) + 65 (tx_signature)
        let mut bytes = Vec::with_capacity(32 + 16 + self.sequences.len() * (20 + 8) + 65);

        // tx_hash (32 bytes)
        bytes.extend_from_slice(self.tx_hash.as_ref());

        // timestamp (u128 -> 16 bytes BE)
        bytes.extend_from_slice(&self.timestamp.as_micros().to_be_bytes());

        // sequences
        for (addr, seq) in &self.sequences {
            bytes.extend_from_slice(addr.as_ref());
            bytes.extend_from_slice(&seq.to_be_bytes());
        }

        bytes.extend_from_slice(self.tx_signature.as_bytes().as_ref());

        hash(&bytes)
    }
}
