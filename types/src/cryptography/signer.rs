use alloy_consensus::{SignableTransaction, TxEip1559, transaction::RlpEcdsaEncodableTx};
use alloy_primitives::PrimitiveSignature;
use alloy_sol_types::SolValue;
use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::{ops::Deref, sync::OnceLock};

use alloy_primitives::Address;

use super::{Hash, Hashable, Merkleizable, merkle_tree::MerkleBuilder};
use crate::Transaction;

#[async_trait]
pub trait Signer {
    async fn sign_tx(&self, tx: &Transaction) -> Result<Signed<Transaction>>;
}

#[async_trait]
impl<S> Signer for S
where
    S: alloy_signer::Signer<PrimitiveSignature> + Send + Sync,
{
    async fn sign_tx(&self, tx: &Transaction) -> Result<Signed<Transaction>> {
        let signature = self.sign_hash(&tx.signature_hash()).await?;
        Ok(Signed {
            signed: tx.clone(),
            signature,
            signer: self.address(),
            hash: OnceLock::new(),
        })
    }
}

pub trait SignerSync {
    fn sign_tx(&self, tx: &Transaction) -> Result<Signed<Transaction>>;
}

impl<S> SignerSync for S
where
    S: alloy_signer::SignerSync<PrimitiveSignature> + Send + Sync,
    S: alloy_signer::Signer<PrimitiveSignature> + Send + Sync,
{
    fn sign_tx(&self, tx: &Transaction) -> Result<Signed<Transaction>> {
        let signature = self.sign_hash_sync(&tx.signature_hash())?;
        Ok(Signed {
            signed: tx.clone(),
            signature,
            signer: self.address(),
            hash: OnceLock::new(),
        })
    }
}

// Guarantees Signed<T>.signer == Signed<T>.signature.recover_address(T.hash())
// by the fact that it can only be constructed by functions that guarantee the address.
// Only works with ECDSA signatures for now
#[non_exhaustive]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Signed<T> {
    pub signed: T,
    pub signature: PrimitiveSignature,
    pub signer: Address,
    hash: OnceLock<Hash>,
}

impl Serialize for Signed<Transaction> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        #[serde_as]
        #[derive(Serialize)]
        struct Helper<'a> {
            #[serde_as(as = "serde_bincode_compat::transaction::TxEip1559")]
            signed: &'a Transaction,
            signature: &'a PrimitiveSignature,
        }

        Helper {
            signed: &self.signed,
            signature: &self.signature,
        }
        .serialize(serializer)
    }
}

impl<'de> Deserialize<'de> for Signed<Transaction> {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        #[serde_as]
        #[derive(Deserialize)]
        struct Helper {
            #[serde_as(as = "serde_bincode_compat::transaction::TxEip1559")]
            signed: Transaction,
            signature: PrimitiveSignature,
        }
        let Helper { signed, signature } = Helper::deserialize(deserializer)?;

        let signer =
            alloy_consensus::Signed::new_unchecked(signed.clone(), signature, signed.hash_custom())
                .recover_signer()
                .map_err(serde::de::Error::custom)?;

        Ok(Signed {
            signed,
            signature,
            signer,
            hash: OnceLock::new(),
        })
    }
}

impl<T: Hashable> Deref for Signed<T> {
    type Target = T;

    fn deref(&self) -> &Self::Target {
        &self.signed
    }
}

// the actual hash used for identifying a transaction
impl<T: RlpEcdsaEncodableTx> Hashable for Signed<T> {
    fn hash_custom(&self) -> Hash {
        *self
            .hash
            .get_or_init(|| self.signed.tx_hash(&self.signature))
    }
}

impl TryFrom<alloy_consensus::Signed<TxEip1559, PrimitiveSignature>> for Signed<Transaction> {
    type Error = anyhow::Error;

    fn try_from(value: alloy_consensus::Signed<TxEip1559>) -> Result<Self> {
        let signer = value.recover_signer()?;

        let tx: Transaction = value.tx().clone();

        Ok(Signed {
            signed: tx,
            signature: *value.signature(),
            signer,
            hash: OnceLock::new(),
        })
    }
}

impl<T: Merkleizable + Hashable> Merkleizable for Signed<T> {
    fn append_leaves(&self, builder: &mut MerkleBuilder) {
        builder.add_merkleizable("signed", &self.signed);
        builder.add_field("signer", self.signer.abi_encode().hash_custom());
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
#[non_exhaustive]
pub struct UncheckedSigned<T> {
    pub signed: T,
    pub signature: PrimitiveSignature,
    pub signer: Address,
    hash: OnceLock<Hash>,
}

use alloy_consensus::serde_bincode_compat;
use serde_with::serde_as;

impl Serialize for UncheckedSigned<Transaction> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        #[serde_as]
        #[derive(Serialize)]
        struct Helper<'a> {
            #[serde_as(as = "serde_bincode_compat::transaction::TxEip1559")]
            signed: &'a Transaction,
            signature: &'a PrimitiveSignature,
            signer: &'a Address,
        }

        Helper {
            signed: &self.signed,
            signature: &self.signature,
            signer: &self.signer,
        }
        .serialize(serializer)
    }
}

impl<'de> Deserialize<'de> for UncheckedSigned<Transaction> {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        #[serde_as]
        #[derive(Deserialize)]
        struct Helper {
            #[serde_as(as = "serde_bincode_compat::transaction::TxEip1559")]
            signed: Transaction,
            signature: PrimitiveSignature,
            signer: Address,
        }
        let helper = Helper::deserialize(deserializer)?;
        Ok(UncheckedSigned {
            signed: helper.signed,
            signature: helper.signature,
            signer: helper.signer,
            hash: OnceLock::new(),
        })
    }
}

impl<T: RlpEcdsaEncodableTx> Hashable for UncheckedSigned<T> {
    fn hash_custom(&self) -> Hash {
        *self
            .hash
            .get_or_init(|| self.signed.tx_hash(&self.signature))
    }
}

impl From<Signed<Transaction>> for UncheckedSigned<Transaction> {
    fn from(signed: Signed<Transaction>) -> Self {
        UncheckedSigned {
            signed: signed.signed,
            signature: signed.signature,
            signer: signed.signer,
            hash: signed.hash,
        }
    }
}

impl UncheckedSigned<Transaction> {
    /// Convert from an `UncheckedSigned<Transaction>` to a fully fledged `Signed<Transaction>`
    /// _without_ re-verifying.
    pub fn into_signed_unchecked(self) -> Signed<Transaction> {
        // Make a "blind" Signed structure that does *not* re-check
        Signed {
            signed: self.signed,
            signature: self.signature,
            signer: self.signer,
            hash: self.hash,
        }
    }
}

impl<T: Hashable> Deref for UncheckedSigned<T> {
    type Target = T;

    fn deref(&self) -> &Self::Target {
        &self.signed
    }
}

impl TryFrom<alloy_consensus::Signed<TxEip1559, PrimitiveSignature>>
    for UncheckedSigned<Transaction>
{
    type Error = anyhow::Error;

    fn try_from(value: alloy_consensus::Signed<TxEip1559>) -> Result<Self> {
        let signer = value.recover_signer()?;

        Ok(UncheckedSigned {
            signature: *value.signature(),
            signed: value.strip_signature(),
            signer,
            hash: OnceLock::new(),
        })
    }
}

impl<T: Merkleizable + Hashable> Merkleizable for UncheckedSigned<T> {
    fn append_leaves(&self, builder: &mut MerkleBuilder) {
        builder.add_merkleizable("signed", &self.signed);
        builder.add_field("signer", self.signer.abi_encode().hash_custom());
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        Hashable,
        cryptography::signer::{SignerSync, UncheckedSigned},
    };
    use alloy_signer_local::PrivateKeySigner;
    use arbitrary::Arbitrary;
    use bincode::config::standard;
    use rand::Rng;

    use super::Transaction;

    fn arbitrary_signed_tx() -> Signed<Transaction> {
        let mut bytes = [0u8; 1024];
        rand::rng().fill(bytes.as_mut_slice());
        let tx = Transaction::arbitrary(&mut arbitrary::Unstructured::new(&bytes)).unwrap();

        let signer = PrivateKeySigner::random();
        SignerSync::sign_tx(&signer, &tx).unwrap()
    }

    #[test]
    fn signed_serialization() {
        let mut signed = arbitrary_signed_tx();
        let signer = signed.signer;
        signed.signer = Default::default(); // Clear signer to test serialization without it

        let serialized = serde_json::to_string(&signed).unwrap();
        let deserialized: Signed<Transaction> = serde_json::from_str(&serialized).unwrap();

        assert_eq!(signed.signed, deserialized.signed);
        assert_eq!(signer, deserialized.signer);
        assert_eq!(signed.signature, deserialized.signature);
    }

    #[test]
    fn signed_serialization_with_bincode() {
        let mut signed = arbitrary_signed_tx();
        let signer = signed.signer;
        signed.signer = Default::default(); // Clear signer to test serialization without it

        let serialized = bincode::serde::encode_to_vec(&signed, standard()).unwrap();
        let (deserialized, _): (Signed<Transaction>, _) =
            bincode::serde::decode_from_slice(&serialized, standard()).unwrap();

        assert_eq!(signed.signed, deserialized.signed);
        assert_eq!(signer, deserialized.signer);
        assert_eq!(signed.signature, deserialized.signature);
    }

    #[test]
    fn unchecked_signed_serialization() {
        let unchecked_signed: UncheckedSigned<_> = arbitrary_signed_tx().into();

        let serialized = serde_json::to_string(&unchecked_signed).unwrap();
        let deserialized: UncheckedSigned<Transaction> = serde_json::from_str(&serialized).unwrap();

        assert_eq!(unchecked_signed, deserialized);
    }

    #[test]
    fn serialize_with_bincode() {
        let unchecked_signed: UncheckedSigned<_> = arbitrary_signed_tx().into();

        let serialized = bincode::serde::encode_to_vec(&unchecked_signed, standard()).unwrap();
        let (deserialized, _) = bincode::serde::decode_from_slice(&serialized, standard()).unwrap();

        assert_eq!(unchecked_signed, deserialized);
    }

    #[test]
    fn consistent_hashing() {
        let signed = arbitrary_signed_tx();
        let unchecked_signed: UncheckedSigned<Transaction> = signed.clone().into();
        assert_eq!(unchecked_signed.hash_custom(), signed.hash_custom());
    }

    #[test]
    fn signed_unchecked_roundtrip() {
        let signed = arbitrary_signed_tx();
        let unchecked: UncheckedSigned<Transaction> = signed.clone().into();
        let back_to_signed = unchecked.into_signed_unchecked();

        assert_eq!(signed, back_to_signed);
    }
}
