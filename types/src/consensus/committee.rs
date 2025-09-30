use super::{Attestation, Certificate};
use crate::cryptography::hash::{Hash, Hashable};
use alloy_primitives::{Address, Signature};
use anyhow::ensure;
use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;

#[derive(Debug, thiserror::Error)]
pub enum CommitteeError {
    #[error("verification failed due to insufficient quorum ({got} < {required})")]
    InsufficientQuorum { got: usize, required: usize },
    #[error("validator {0} not in committee")]
    ValidatorNotInCommittee(Address),
    #[error(transparent)]
    SignatureError(#[from] alloy_primitives::SignatureError),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Committee {
    pub validators: BTreeSet<Address>,
    pub cert_quorum: usize,
    pub quorum_size: usize,
}

impl Committee {
    pub fn new(
        validators: impl IntoIterator<Item = Address>,
        cert_quorum: usize,
        quorum_size: usize,
    ) -> anyhow::Result<Self> {
        ensure!(quorum_size > 0, "quorum_size must be greater than 0");
        ensure!(cert_quorum > 0, "cert_quorum must be greater than 0");
        ensure!(
            cert_quorum <= quorum_size,
            "cert_quorum must be less than or equal to quorum_size"
        );
        let validators: BTreeSet<Address> = validators.into_iter().collect();
        ensure!(
            quorum_size <= validators.len(),
            "quorum_size must be less than or equal to the number of validators"
        );
        Ok(Committee {
            validators,
            quorum_size,
            cert_quorum,
        })
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
        self.validators.contains(address)
    }

    pub fn verify_attestation<T: Hashable>(
        &self,
        attestation: &Attestation<T>,
    ) -> Result<bool, CommitteeError> {
        if !self.is_in_committee(&attestation.public_key) {
            return Err(CommitteeError::ValidatorNotInCommittee(
                attestation.public_key,
            ));
        }

        let signer = attestation
            .signature
            .recover_address_from_prehash(&attestation.attested.hash_custom())?;
        Ok(signer == attestation.public_key)
    }

    // utility function that does aggregate verification over an arbitrary hash
    pub fn verify_aggregate_attestation(
        &self,
        digest: Hash,
        signatures: &Vec<Signature>,
        quorum_size: usize,
    ) -> Result<(), CommitteeError> {
        if signatures.len() < quorum_size {
            return Err(CommitteeError::InsufficientQuorum {
                got: signatures.len(),
                required: quorum_size,
            });
        }

        let mut recovered_signers = BTreeSet::new();

        // Recover and validate each signature
        for sig in signatures {
            let recovered_address = match sig.recover_address_from_prehash(&digest) {
                Ok(addr) => addr,
                Err(e) => {
                    tracing::debug!("failed to recover address from signature: {e}");
                    continue;
                }
            };

            // Skip if signer not in committee (treat as invalid signature)
            if !self.is_in_committee(&recovered_address) {
                continue;
            }

            recovered_signers.insert(recovered_address);
        }

        // Verify we have enough unique valid signatures from committee members
        if recovered_signers.len() < quorum_size {
            return Err(CommitteeError::InsufficientQuorum {
                got: recovered_signers.len(),
                required: quorum_size,
            });
        }

        Ok(())
    }

    pub fn verify_certificate<C: Hashable>(
        &self,
        certificate: &Certificate<C>,
        quorum_size: usize,
    ) -> Result<(), CommitteeError> {
        self.verify_aggregate_attestation(
            certificate.certified.hash_custom(),
            &certificate.signatures,
            quorum_size,
        )
    }

    pub fn verify_high_quorum_certificate<C: Hashable>(
        &self,
        certificate: &Certificate<C>,
    ) -> Result<(), CommitteeError> {
        self.verify_certificate(certificate, self.quorum_size)
    }

    pub fn verify_low_quorum_certificate<C: Hashable>(
        &self,
        certificate: &Certificate<C>,
    ) -> Result<(), CommitteeError> {
        self.verify_certificate(certificate, self.cert_quorum)
    }
}
