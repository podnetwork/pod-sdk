use alloy_primitives::PrimitiveSignature;
use serde::{Deserialize, Serialize};

use crate::cryptography::hash::Hashable;

// Certificate represents a proof on an agreement by the committee
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Certificate<T: Hashable> {
    pub signatures: Vec<PrimitiveSignature>,
    pub certified: T,
}

impl<T: Hashable> Certificate<T> {
    pub fn new(signatures: Vec<PrimitiveSignature>, certified: T) -> Self {
        Certificate {
            signatures,
            certified,
        }
    }
}
