use alloy_consensus::{SignableTransaction, TxLegacy};
use alloy_primitives::PrimitiveSignature;
use alloy_sol_types::SolValue;
use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Deserializer, Serialize};
use std::ops::Deref;

use alloy_primitives::Address;

use super::{Hashable, Merkleizable, merkle_tree::MerkleBuilder};
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
            _private: (),
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
            _private: (),
        })
    }
}

// Guarantees Signed<T>.signer == Signed<T>.signature.recover_address(T.hash())
// by the fact that it can only be constructed by functions that guarantee the address.
// Only works with ECDSA signatures for now
#[allow(clippy::manual_non_exhaustive)]
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct Signed<T: Hashable> {
    pub signed: T,
    pub signature: PrimitiveSignature,
    #[serde(skip_serializing)]
    pub signer: Address,
    _private: (), // to prevent construction outside of this module
}

impl<'de, T> Deserialize<'de> for Signed<T>
where
    T: Hashable + Deserialize<'de> + Clone,
    T: SignableTransaction<PrimitiveSignature>,
{
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        #[derive(Deserialize)]
        struct Helper<T> {
            signed: T,
            signature: PrimitiveSignature,
        }

        let Helper::<T> { signed, signature } = Helper::deserialize(deserializer)?;
        let tx_hash = signed.hash_custom();

        let signer = alloy_consensus::Signed::new_unchecked(signed.clone(), signature, tx_hash)
            .recover_signer()
            .map_err(serde::de::Error::custom)?;

        Ok(Signed {
            signed,
            signature,
            signer,
            _private: (),
        })
    }
}

impl<T: Hashable> Deref for Signed<T> {
    type Target = T;

    fn deref(&self) -> &Self::Target {
        &self.signed
    }
}

impl TryFrom<alloy_consensus::Signed<TxLegacy, PrimitiveSignature>> for Signed<Transaction> {
    type Error = anyhow::Error;

    fn try_from(value: alloy_consensus::Signed<TxLegacy>) -> Result<Self> {
        let signer = value.recover_signer()?;

        let tx: Transaction = value.tx().clone();

        Ok(Signed {
            signed: tx,
            signature: *value.signature(),
            signer,
            _private: (),
        })
    }
}

impl<T: Merkleizable + Hashable> Merkleizable for Signed<T> {
    fn append_leaves(&self, builder: &mut MerkleBuilder) {
        builder.add_merkleizable("signed", &self.signed);
        builder.add_field("signer", self.signer.abi_encode().hash_custom());
    }
}

#[allow(clippy::manual_non_exhaustive)]
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct UncheckedSigned<T: Hashable> {
    pub signed: T,
    pub signature: PrimitiveSignature,
    pub signer: Address,
    _private: (), // to prevent construction outside of this module
}

impl From<Signed<Transaction>> for UncheckedSigned<Transaction> {
    fn from(signed: Signed<Transaction>) -> Self {
        Self {
            signed: signed.signed,
            signature: signed.signature,
            signer: signed.signer,
            _private: (),
        }
    }
}

impl UncheckedSigned<Transaction> {
    /// Convert from an `UncheckedSigned<Transaction>` to a fully fledged `Signed<Transaction>`
    /// _without_ re-verifying.
    pub fn into_signed_unchecked(self) -> Signed<Transaction> {
        // Make a “blind” Signed structure that does *not* re-check
        Signed {
            signed: self.signed,
            signature: self.signature,
            signer: self.signer,
            _private: (),
        }
    }
}

impl<T: Hashable> Deref for UncheckedSigned<T> {
    type Target = T;

    fn deref(&self) -> &Self::Target {
        &self.signed
    }
}

impl TryFrom<alloy_consensus::Signed<TxLegacy, PrimitiveSignature>>
    for UncheckedSigned<Transaction>
{
    type Error = anyhow::Error;

    fn try_from(value: alloy_consensus::Signed<TxLegacy>) -> Result<Self> {
        let signer = value.recover_signer()?;

        let tx: Transaction = value.tx().clone();

        Ok(UncheckedSigned {
            signed: tx,
            signature: *value.signature(),
            signer,
            _private: (),
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
    use alloy_primitives::U256;
    use alloy_signer_local::PrivateKeySigner;

    #[test]
    fn signed_serialization() {
        let tx = Transaction {
            chain_id: Some(2137),
            nonce: 123986,
            gas_price: 1_000_000_000,
            gas_limit: 21_000,
            to: alloy_primitives::TxKind::Create,
            value: U256::from(1_000),
            input: [1, 2, 3, 4].into(),
        };
        let signer = PrivateKeySigner::random();
        let mut signed = SignerSync::sign_tx(&signer, &tx).unwrap();
        signed.signer = Default::default(); // Clear signer to test serialization without it

        let serialized = serde_json::to_string(&signed).unwrap();
        let deserialized: Signed<Transaction> = serde_json::from_str(&serialized).unwrap();

        assert_eq!(signed.signed, deserialized.signed);
        assert_eq!(signer.address(), deserialized.signer);
        assert_eq!(signed.signature, deserialized.signature);
    }

    #[test]
    fn unchecked_signed_serialization() {
        let tx = Transaction {
            chain_id: Some(2137),
            nonce: 123986,
            gas_price: 1_000_000_000,
            gas_limit: 21_000,
            to: alloy_primitives::TxKind::Create,
            value: U256::from(1_000),
            input: [1, 2, 3, 4].into(),
        };

        let signer = PrivateKeySigner::random();
        let unchecked_signed: UncheckedSigned<_> =
            SignerSync::sign_tx(&signer, &tx).unwrap().into();

        let serialized = serde_json::to_string(&unchecked_signed).unwrap();
        let deserialized: UncheckedSigned<Transaction> = serde_json::from_str(&serialized).unwrap();

        assert_eq!(unchecked_signed, deserialized);
    }
}
