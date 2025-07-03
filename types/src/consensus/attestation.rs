use alloy_primitives::{Address, PrimitiveSignature};
use alloy_sol_types::SolValue;
use serde::{Deserialize, Serialize};

use crate::{
    Receipt, Signed, Timestamp, Transaction,
    cryptography::{
        hash::{Hash, Hashable},
        signer::UncheckedSigned,
    },
    ledger::receipt::UncheckedReceipt,
};

pub type TransactionAttestation = Attestation<Signed<Transaction>>;
pub type ReceiptAttestation = Attestation<Receipt>;

pub type UncheckedReceiptAttestation = Attestation<UncheckedReceipt>;

pub type UncheckedTransactionAttestation = Attestation<UncheckedSigned<Transaction>>;

#[derive(Clone, Serialize, Deserialize, Debug, PartialEq, Eq)]
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
pub struct Attestation<T> {
    pub public_key: Address,
    pub signature: PrimitiveSignature,
    pub attested: T,
}

impl<T: Hashable> Hashable for Attestation<T> {
    fn hash_custom(&self) -> Hash {
        let mut hasher = alloy_primitives::Keccak256::default();
        hasher.update(self.public_key.as_slice());
        hasher.update(self.signature.as_bytes());
        hasher.update(self.attested.hash_custom().as_slice());
        hasher.finalize()
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TimestampedHeadlessAttestation {
    pub timestamp: Timestamp,
    pub public_key: Address,
    pub signature: PrimitiveSignature,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct HeadlessAttestation {
    pub public_key: Address,
    pub signature: PrimitiveSignature,
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

impl From<Indexed<Attestation<Signed<Transaction>>>> for TimestampedHeadlessAttestation {
    fn from(indexed: Indexed<Attestation<Signed<Transaction>>>) -> Self {
        Self {
            timestamp: indexed.index,
            public_key: indexed.value.public_key,
            signature: indexed.value.signature,
        }
    }
}
