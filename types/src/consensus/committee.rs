use super::{Attestation, Certificate};
use crate::cryptography::hash::Hashable;
use alloy_primitives::{Address, B256, PrimitiveSignature};
use anyhow::{Result, anyhow};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Committee {
    pub validators: Vec<Address>,
    validator_set: HashMap<Address, bool>,
    pub quorum_size: usize,
}

impl Committee {
    pub fn new(mut validators: Vec<Address>, quorum_size: usize) -> Self {
        validators.sort();
        let validator_set = validators.iter().map(|r| (*r, true)).collect();
        Committee {
            validators,
            validator_set,
            quorum_size,
        }
    }

    pub fn size(&self) -> usize {
        self.validators.len()
    }

    pub fn fault_tolerance(&self) -> usize {
        self.size() - self.quorum_size
    }

    pub fn f_plus_one(&self) -> usize {
        self.fault_tolerance() + 1
    }

    pub fn is_in_committee(&self, address: &Address) -> bool {
        self.validator_set.contains_key(address)
    }

    pub fn verify_attestation<T: Hashable>(&self, attestation: &Attestation<T>) -> Result<bool> {
        if !self.is_in_committee(&attestation.public_key) {
            return Err(anyhow!("Validator not in committee"));
        }

        let signer = attestation
            .signature
            .recover_address_from_prehash(&attestation.attested.hash_custom())?;
        Ok(signer == attestation.public_key)
    }

    // utility function that does aggregate verification over an arbitrary hash
    pub fn verify_aggregate_attestation(
        &self,
        digest: B256,
        signatures: &Vec<PrimitiveSignature>,
    ) -> Result<()> {
        if signatures.len() < self.quorum_size {
            return Err(anyhow!("Insufficient quorum"));
        }

        let mut recovered_signers = HashSet::new();

        // Recover and validate each signature
        for sig in signatures {
            let recovered_address = sig.recover_address_from_prehash(&digest)?;

            // Skip if signer not in committee (treat as invalid signature)
            if !self.is_in_committee(&recovered_address) {
                continue;
            }

            recovered_signers.insert(recovered_address);
        }

        // Verify we have enough unique valid signatures from committee members
        if recovered_signers.len() < self.quorum_size {
            return Err(anyhow!(
                "Insufficient unique valid signatures from committee members"
            ));
        }

        Ok(())
    }

    pub fn verify_certificate<C: Hashable>(&self, certificate: &Certificate<C>) -> Result<()> {
        self.verify_aggregate_attestation(
            certificate.certified.hash_custom(),
            &certificate.signatures,
        )
    }
}
