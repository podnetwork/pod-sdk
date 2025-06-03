use alloy_sol_types::SolValue;
use serde::{Deserialize, Serialize, de::DeserializeOwned};

use crate::{
    Receipt, Signed, Timestamp, Transaction,
    cryptography::{
        ecdsa::{AddressECDSA, SignatureECDSA},
        hash::{Hash, Hashable, hash},
        signer::UncheckedSigned,
    },
    ledger::receipt::UncheckedReceipt,
};

pub type TransactionAttestation = Attestation<Signed<Transaction>>;
pub type ReceiptAttestation = Attestation<Receipt>;

pub type UncheckedReceiptAttestation = Attestation<UncheckedReceipt>;

pub type UncheckedTransactionAttestation = Attestation<UncheckedSigned<Transaction>>;

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Indexed<T> {
    #[serde(rename = "timestamp")]
    pub index: Timestamp, // TODO: consider sequential numbers
    pub value: T,
}

impl<T> Indexed<T> {
    pub fn new(index: Timestamp, value: T) -> Self {
        Indexed { index, value }
    }
}

impl<T> From<Indexed<Attestation<T>>> for Indexed<HeadlessAttestation> {
    fn from(value: Indexed<Attestation<T>>) -> Self {
        Indexed {
            index: value.index,
            value: value.value.into(),
        }
    }
}

impl<T: Hashable> Hashable for Indexed<T> {
    fn hash_custom(&self) -> Hash {
        alloy_primitives::keccak256(
            [
                self.index.as_micros().abi_encode(),
                self.value.hash_custom().to_vec(),
            ]
            .concat(),
        )
    }
}

// An Attestation<T> is T signed by a validator using ECDSA
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
