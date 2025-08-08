use alloy_consensus::{
    SignableTransaction, TxEip1559, serde_bincode_compat, transaction::RlpEcdsaEncodableTx,
};
use alloy_primitives::{Signature, SignatureError};
use alloy_sol_types::SolValue;
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use serde_with::serde_as;
use std::{ops::Deref, sync::OnceLock};

use alloy_primitives::Address;

use super::{Hash, Hashable, Merkleizable, merkle_tree::MerkleBuilder};
use crate::Transaction;

pub trait TxSigner {
    fn sign_tx(&self, tx: Transaction) -> Result<Signed<Transaction>, alloy_signer::Error>;
}

impl<S> TxSigner for S
where
    S: alloy_signer::SignerSync<Signature>,
    S: alloy_signer::Signer<Signature>,
{
    fn sign_tx(&self, tx: Transaction) -> Result<Signed<Transaction>, alloy_signer::Error> {
        let signature = self.sign_hash_sync(&tx.signature_hash())?;
        Ok(Signed {
            signed: tx,
            signature,
            signer: self.address(),
            hash: OnceLock::new(),
        })
    }
}

// Guarantees Signed<T>.signer == Signed<T>.signature.recover_address(T.hash())
// by the fact that it can only be constructed by functions that guarantee the address.
// Only works with ECDSA signatures for now
// The signature check happens on both rounds. For the second round, it *might* not be
// necessary but we still want to do it to ensure that if something ever went wrong, we
// have a second line of defence.
#[non_exhaustive]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Signed<T> {
    pub signed: T,
    pub signature: Signature,
    pub signer: Address,
    pub hash: OnceLock<Hash>,
}

impl<T> Signed<T>
where
    T: SignableTransaction<Signature>,
{
    /// Creates a new `Signed<T>` with the given `signed`, `signature`, and `signer`.
    ///
    /// # Safety
    /// The caller must ensure that the `signer` is the correct address that corresponds to the
    /// `signature`
    pub unsafe fn new_unchecked(signed: T, signature: Signature, signer: Address) -> Self {
        debug_assert_eq!(
            signer,
            signature
                .recover_address_from_prehash(&signed.signature_hash())
                .unwrap(),
            "Signer address does not match the signature's recovered address"
        );
        Signed {
            signed,
            signature,
            signer,
            hash: OnceLock::new(),
        }
    }
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
            signature: &'a Signature,
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
            signature: Signature,
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

impl TryFrom<alloy_consensus::Signed<TxEip1559, Signature>> for Signed<Transaction> {
    type Error = SignatureError;

    fn try_from(value: alloy_consensus::Signed<TxEip1559>) -> Result<Self, Self::Error> {
        let signer = value.recover_signer()?;

        Ok(Signed {
            signature: *value.signature(),
            signed: value.strip_signature(),
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

#[cfg(feature = "arbitrary")]
impl<'a, T: arbitrary::Arbitrary<'a> + Hashable + SignableTransaction<Signature>>
    arbitrary::Arbitrary<'a> for Signed<T>
{
    fn arbitrary(u: &mut arbitrary::Unstructured<'a>) -> arbitrary::Result<Self> {
        use alloy_signer::SignerSync;
        let signed = T::arbitrary(u)?;
        let signer = alloy_signer_local::PrivateKeySigner::random();
        let signature = signer.sign_hash_sync(&signed.signature_hash()).unwrap();
        Ok(Signed {
            signed,
            signature,
            signer: signer.address(),
            hash: OnceLock::new(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use arbitrary::Arbitrary;
    use bincode::config::standard;

    fn arbitrary_signed_tx() -> Signed<Transaction> {
        let bytes: [u8; 1024] = rand::random();
        Signed::arbitrary(&mut arbitrary::Unstructured::new(&bytes)).unwrap()
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
    fn signed_new_unchecked() {
        let signed = arbitrary_signed_tx();

        let new_signed = unsafe {
            Signed::new_unchecked(signed.signed.clone(), signed.signature, signed.signer)
        };

        assert_eq!(new_signed, signed);
    }
}
