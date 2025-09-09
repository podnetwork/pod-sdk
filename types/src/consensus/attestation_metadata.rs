use crate::Timestamp;
use alloy_primitives::Address;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AttestationMetadata {
    pub timestamp: Timestamp,
    pub global_sequence: u64,
    pub contract_sequences: Vec<(Address, u64)>,
}
