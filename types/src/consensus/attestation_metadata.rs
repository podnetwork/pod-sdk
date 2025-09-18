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
        hasher.update(self.timestamp.as_micros().to_be_bytes());
        hasher.update(self.global_sequence.to_be_bytes());

        hasher.update((self.contract_sequences.len() as u32).to_be_bytes());
        for (addr, seq) in self.contract_sequences.iter() {
            hasher.update(addr.as_slice());
            hasher.update(seq.to_be_bytes());
        }

        hasher.finalize()
    }
}
