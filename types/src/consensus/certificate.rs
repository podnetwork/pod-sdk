use crate::cryptography::{ecdsa::SignatureECDSA, hash::Hashable, Hash, SigHashable};
use serde::{Deserialize, Serialize};

// Certificate represents a proof on an agreement by the committee
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Certificate<T>
where
    T: Hashable + SigHashable,
{
    pub signatures: Vec<SignatureECDSA>,
    pub certified: T,
}

impl<T: Hashable + SigHashable> Certificate<T> {
    pub fn new(signatures: Vec<SignatureECDSA>, certified: T) -> Self {
        Certificate {
            signatures,
            certified,
        }
    }
}
impl<T: Hashable + SigHashable> SigHashable for Certificate<T> {
    fn hash_for_signature(&self) -> Hash {
        self.certified.hash_for_signature()
    }
}
