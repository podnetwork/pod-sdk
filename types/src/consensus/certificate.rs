use alloy_primitives::PrimitiveSignature;
use serde::{Deserialize, Serialize};

// Certificate represents a proof on an agreement by the committee
#[derive(Clone, Serialize, Deserialize, Debug, PartialEq, Eq)]
#[cfg_attr(feature = "arbitrary", derive(arbitrary::Arbitrary))]
pub struct Certificate<T> {
    pub signatures: Vec<PrimitiveSignature>,
    pub certified: T,
}

impl<T> Certificate<T> {
    pub fn new(signatures: Vec<PrimitiveSignature>, certified: T) -> Self {
        Certificate {
            signatures,
            certified,
        }
    }
}
