use super::{Attestation, Certificate};
use crate::{
    cryptography::{ecdsa::AddressECDSA, hash::Hashable},
    ecdsa::SignatureECDSA,
};
use alloy_primitives::B256;
use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Committee {
    pub replicas: Vec<AddressECDSA>,
    replica_set: HashMap<AddressECDSA, bool>,
    pub quorum_size: usize,
}

impl Committee {
    pub fn new(mut replicas: Vec<AddressECDSA>, quorum_size: usize) -> Self {
        replicas.sort();
        let replica_set = replicas.iter().map(|r| (*r, true)).collect();
        Committee {
            replicas,
            replica_set,
            quorum_size,
        }
    }

    pub fn size(&self) -> usize {
        self.replicas.len()
    }

    pub fn fault_tolerance(&self) -> usize {
        self.size() - self.quorum_size
    }

    pub fn f_plus_one(&self) -> usize {
        self.fault_tolerance() + 1
    }

    pub fn is_in_committee(&self, address: &AddressECDSA) -> bool {
        self.replica_set.contains_key(address)
    }

    pub fn verify_attestation<T: Hashable>(&self, attestation: &Attestation<T>) -> Result<bool> {
        if !self.is_in_committee(&attestation.public_key) {
            return Err(anyhow!("Replica not in committee"));
        }

        attestation.public_key.verify(
            attestation.attested.hash_custom().as_slice(),
            &attestation.signature,
        )
    }

    // utility function that does aggregate verification over an arbitrary hash
    pub fn verify_aggregate_attestation(
        &self,
        digest: B256,
        signatures: &Vec<SignatureECDSA>,
    ) -> Result<bool> {
        if signatures.len() < self.quorum_size {
            return Err(anyhow!("Insufficient quorum"));
        }

        let mut recovered_signers = HashSet::new();

        // Recover and validate each signature
        for sig in signatures {
            // Recover the signer's address
            let recovered_address = match sig.recover_signer(digest.as_slice()) {
                Ok(addr) => addr,
                Err(_) => continue, // Skip invalid signatures
            };

            // Skip if signer not in committee (treat as invalid signature)
            if !self.is_in_committee(&recovered_address) {
                continue;
            }

            // Check for duplicate signers
            if !recovered_signers.insert(recovered_address) {
                continue;
            }
        }

        // Verify we have enough unique valid signatures from committee members
        if recovered_signers.len() < self.quorum_size {
            return Err(anyhow!(
                "Insufficient unique valid signatures from committee members"
            ));
        }

        Ok(true)
    }

    pub fn verify_certificate<C: Hashable>(&self, certificate: &Certificate<C>) -> Result<bool> {
        self.verify_aggregate_attestation(
            certificate.certified.hash_custom(),
            &certificate.signatures,
        )
    }
}
