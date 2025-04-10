use serde::{de::DeserializeOwned, Deserialize, Serialize};

use crate::cryptography::signer::UncheckedSigned;
use crate::ledger::receipt::UncheckedReceipt;
use crate::{
    cryptography::{
        ecdsa::{AddressECDSA, SignatureECDSA},
        hash::{hash, Hash, Hashable},
    },
    storage::Indexed,
    Receipt, Signed, Timestamp, Transaction,
};

pub type TransactionAttestation = Attestation<Signed<Transaction>>;
pub type ReceiptAttestation = Attestation<Receipt>;

pub type UncheckedReceiptAttestation = Attestation<UncheckedReceipt>;

pub type UncheckedTransactionAttestation = Attestation<UncheckedSigned<Transaction>>;

// An Attestation<T> is T signed by a replica using ECDSA
#[derive(Clone, Debug, Serialize, Deserialize, Eq, PartialEq)]
#[serde(bound = "T: Hashable + Serialize + DeserializeOwned + Eq")]
pub struct Attestation<T> {
    pub public_key: AddressECDSA,
    pub signature: SignatureECDSA,
    pub attested: T,
}

impl<T: Hashable> Hashable for Attestation<T> {
    fn hash_custom(&self) -> Hash {
        hash(
            [
                self.public_key.to_bytes(),
                self.signature.to_bytes(),
                self.attested.hash_custom().to_vec(),
            ]
            .concat(),
        )
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TimestampedHeadlessAttestation {
    pub timestamp: Timestamp,
    pub public_key: AddressECDSA,
    pub signature: SignatureECDSA,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct HeadlessAttestation {
    pub public_key: AddressECDSA,
    pub signature: SignatureECDSA,
}

impl<T> From<Attestation<T>> for HeadlessAttestation {
    fn from(attestation: Attestation<T>) -> Self {
        HeadlessAttestation {
            public_key: attestation.public_key,
            signature: attestation.signature,
        }
    }
}

impl From<Indexed<HeadlessAttestation>> for TimestampedHeadlessAttestation {
    fn from(indexed: Indexed<HeadlessAttestation>) -> Self {
        TimestampedHeadlessAttestation {
            timestamp: indexed.index,
            public_key: indexed.value.public_key,
            signature: indexed.value.signature,
        }
    }
}

impl From<Indexed<Attestation<Receipt>>> for TimestampedHeadlessAttestation {
    fn from(indexed: Indexed<Attestation<Receipt>>) -> Self {
        TimestampedHeadlessAttestation {
            timestamp: indexed.index,
            public_key: indexed.value.public_key,
            signature: indexed.value.signature,
        }
    }
}
