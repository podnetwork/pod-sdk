use crate::{Hash, Hashable, Timestamp};
use alloy_primitives::Address;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[cfg_attr(any(test, feature = "arbitrary"), derive(arbitrary::Arbitrary))]
pub struct AttestationMetadata {
    pub timestamp: Timestamp,
    pub global_sequence: u64,
    pub contract_sequences: Vec<(Address, u64)>,
}
impl Hashable for AttestationMetadata {
    fn hash_custom(&self) -> Hash {
        use alloy_primitives::Keccak256;

        let mut hasher = Keccak256::default();
        hasher.update(self.timestamp.hash_custom().as_slice());
        hasher.update(self.global_sequence.to_be_bytes());

        //sort to ensure deterministic, order-independent hashing
        let mut sorted = self.contract_sequences.clone();
        sorted.sort_by(|a, b| match a.0.cmp(&b.0) {
            std::cmp::Ordering::Equal => a.1.cmp(&b.1),
            other => other,
        });

        hasher.update((sorted.len() as u64).to_be_bytes());
        for (addr, seq) in sorted {
            hasher.update(addr.as_slice());
            hasher.update(seq.to_be_bytes());
        }

        hasher.finalize()
    }
}
