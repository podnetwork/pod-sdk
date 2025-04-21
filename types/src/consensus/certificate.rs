use serde::{Deserialize, Serialize};

use crate::cryptography::{ecdsa::SignatureECDSA, hash::Hashable};

// Certificate represents a proof on an agreement by the committee
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Certificate<T: Hashable> {
    pub signatures: Vec<SignatureECDSA>,
    pub certified: T,
}

impl<T: Hashable> Certificate<T> {
    pub fn new(signatures: Vec<SignatureECDSA>, certified: T) -> Self {
        Certificate {
            signatures,
            certified,
        }
    }
}
