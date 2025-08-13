use alloy_primitives::Signature;
use serde::{Deserialize, Serialize};

// Certificate represents a proof on an agreement by the committee
#[derive(Clone, Serialize, Deserialize, Debug, PartialEq, Eq)]
#[cfg_attr(feature = "arbitrary", derive(arbitrary::Arbitrary))]
pub struct Certificate<T> {
    pub signatures: Vec<Signature>,
    pub certified: T,
}

impl<T> Certificate<T> {
    pub fn new(signatures: Vec<Signature>, certified: T) -> Self {
        Certificate {
            signatures,
            certified,
        }
    }
}
