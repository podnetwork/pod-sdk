use alloy_primitives::{Address, Signature};
use alloy_sol_types::{SolStruct, SolValue};
use serde::{Deserialize, Serialize};

use crate::{
    Merkleizable, Receipt, Signed, Timestamp,
    cryptography::{Hash, hash::Hashable, merkle_tree::MerkleBuilder},
};

pub type ReceiptAttestation = Attestation<Receipt>;

#[derive(Clone, Serialize, Deserialize, Debug, PartialEq, Eq)]
#[cfg_attr(feature = "arbitrary", derive(arbitrary::Arbitrary))]
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
#[derive(Copy, Clone, Debug, Serialize, Deserialize, Eq, PartialEq)]
pub struct Attestation<T> {
    pub public_key: Address,
    pub signature: Signature,
    pub attested: T,
}

#[cfg(feature = "arbitrary")]
impl<'a, T: arbitrary::Arbitrary<'a> + Hashable> arbitrary::Arbitrary<'a> for Attestation<T> {
    fn arbitrary(u: &mut arbitrary::Unstructured<'a>) -> arbitrary::Result<Self> {
        use alloy_signer::SignerSync;
        let signer = alloy_signer_local::PrivateKeySigner::random();
        let attested = T::arbitrary(u)?;

        Ok(Attestation {
            public_key: signer.address(),
            signature: signer.sign_hash_sync(&attested.hash_custom()).unwrap(),
            attested,
        })
    }
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

impl<T> From<Signed<T>> for Attestation<T> {
    fn from(signed: Signed<T>) -> Self {
        Attestation {
            public_key: signed.signer,
            signature: signed.signature,
            attested: signed.signed,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[cfg_attr(feature = "arbitrary", derive(arbitrary::Arbitrary))]
pub struct TimestampedHeadlessAttestation {
    pub timestamp: Timestamp,
    pub public_key: Address,
    pub signature: Signature,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[cfg_attr(feature = "arbitrary", derive(arbitrary::Arbitrary))]
pub struct HeadlessAttestation {
    pub public_key: Address,
    pub signature: Signature,
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

impl<T> From<Indexed<Attestation<T>>> for TimestampedHeadlessAttestation {
    fn from(indexed: Indexed<Attestation<T>>) -> Self {
        Self {
            timestamp: indexed.index,
            public_key: indexed.value.public_key,
            signature: indexed.value.signature,
        }
    }
}

mod sol {
    alloy_sol_types::sol! {
        #[derive(Copy, Debug, std::hash::Hash, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
        #[cfg_attr(feature = "arbitrary", derive(arbitrary::Arbitrary))]
        struct AttestedTx {
            bytes32 tx_hash;
            bool success;
            uint64 committee_epoch;
        }

        #[derive(Copy, Debug, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
        #[cfg_attr(feature = "arbitrary", derive(arbitrary::Arbitrary))]
        struct AttestedBot {
            uint64 nonce;
            address signer;
        }
    }
}

pub use sol::{AttestedBot, AttestedTx};

impl AttestedTx {
    pub fn success(tx_hash: Hash, committee_epoch: u64) -> Self {
        Self {
            tx_hash,
            success: true,
            committee_epoch,
        }
    }

    pub fn failure(tx_hash: Hash, committee_epoch: u64) -> Self {
        Self {
            tx_hash,
            success: false,
            committee_epoch,
        }
    }
}

impl Hashable for AttestedTx {
    fn hash_custom(&self) -> Hash {
        self.eip712_signing_hash(&alloy_sol_types::eip712_domain! {
            name: "attest_tx",
            version: "1",
            chain_id: 0x50d,
        })
    }
}

impl Merkleizable for AttestedTx {
    fn append_leaves(&self, builder: &mut MerkleBuilder) {
        builder.add_field("tx_hash", self.tx_hash);
        builder.add_field("success", self.success.abi_encode().hash_custom());
        builder.add_field(
            "committee_epoch",
            self.committee_epoch.abi_encode().hash_custom(),
        );
    }
}

impl AttestedBot {
    pub fn new(nonce: u64, signer: Address) -> Self {
        Self { nonce, signer }
    }
}

impl Hashable for AttestedBot {
    fn hash_custom(&self) -> Hash {
        self.eip712_signing_hash(&alloy_sol_types::eip712_domain! {
            name: "attest_bot",
            version: "1",
            chain_id: 0x50d,
        })
    }
}
