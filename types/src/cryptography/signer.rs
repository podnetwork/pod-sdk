use alloy_consensus::{SignableTransaction, TxEip1559};
use alloy_primitives::{PrimitiveSignature, SignatureError};
use alloy_sol_types::SolValue;
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::ops::Deref;

use alloy_primitives::Address;

use super::{Hashable, Merkleizable, merkle_tree::MerkleBuilder};
use crate::Transaction;

pub trait TxSigner {
    fn sign_tx(&self, tx: Transaction) -> Result<Signed<Transaction>, alloy_signer::Error>;
}

impl<S> TxSigner for S
where
    S: alloy_signer::SignerSync<PrimitiveSignature>,
    S: alloy_signer::Signer<PrimitiveSignature>,
{
    fn sign_tx(&self, tx: Transaction) -> Result<Signed<Transaction>, alloy_signer::Error> {
        let signature = self.sign_hash_sync(&tx.signature_hash())?;
        Ok(Signed {
            signed: tx,
            signature,
            signer: self.address(),
        })
    }
}

// Guarantees Signed<T>.signer == Signed<T>.signature.recover_address(T.hash())
// by the fact that it can only be constructed by functions that guarantee the address.
// Only works with ECDSA signatures for now
#[non_exhaustive]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Signed<T: Hashable> {
    pub signed: T,
    pub signature: PrimitiveSignature,
    pub signer: Address,
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
        })
    }
}

impl<T: Hashable> Deref for Signed<T> {
    type Target = T;

    fn deref(&self) -> &Self::Target {
        &self.signed
    }
}

impl TryFrom<alloy_consensus::Signed<TxEip1559, PrimitiveSignature>> for Signed<Transaction> {
    type Error = SignatureError;

    fn try_from(value: alloy_consensus::Signed<TxEip1559>) -> Result<Self, Self::Error> {
        let signer = value.recover_signer()?;

        Ok(Signed {
            signature: *value.signature(),
            signed: value.strip_signature(),
            signer,
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
pub struct UncheckedSigned<T: Hashable> {
    pub signed: T,
    pub signature: PrimitiveSignature,
    pub signer: Address,
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
        })
    }
}

impl From<Signed<Transaction>> for UncheckedSigned<Transaction> {
    fn from(signed: Signed<Transaction>) -> Self {
        UncheckedSigned {
            signed: signed.signed,
            signature: signed.signature,
            signer: signed.signer,
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
    type Error = SignatureError;

    fn try_from(value: alloy_consensus::Signed<TxEip1559>) -> Result<Self, Self::Error> {
        Signed::try_from(value).map(Into::into)
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
    use alloy_signer_local::PrivateKeySigner;
    use arbitrary::Arbitrary;
    use bincode::config::standard;
    use rand::Rng;

    fn arbitrary_signed_tx() -> Signed<Transaction> {
        let mut bytes = [0u8; 1024];
        rand::rng().fill(bytes.as_mut_slice());
        let tx = Transaction::arbitrary(&mut arbitrary::Unstructured::new(&bytes)).unwrap();

        let signer = PrivateKeySigner::random();
        TxSigner::sign_tx(&signer, tx).unwrap()
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
}
