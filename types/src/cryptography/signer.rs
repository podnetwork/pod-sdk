use alloy_consensus::{SignableTransaction, TxEip1559};
use alloy_primitives::PrimitiveSignature;
use alloy_sol_types::SolValue;
use anyhow::Result;
use async_trait::async_trait;
use serde::{
    Deserialize, Deserializer, Serialize, Serializer,
    de::{self, MapAccess, Visitor},
    ser::SerializeStruct,
};
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
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Signed<T: Hashable> {
    pub signed: T,
    pub signature: PrimitiveSignature,
    pub signer: Address,
    _private: (), // to prevent construction outside of this module
}

// Custom serialization and deserialization for Signed<Transaction>
// There are two complications for why this is needed:
//   1. We want to recover signer instead of serializing it,
//      in order to never have to assume the message was already sanitized
//      e.g. avoid accidentally deserializing the signer from an insecure message (eg over network).
//   2. TxEip1559::bytes does not actually allow for bincode serialization
//      because of error that bincode cannot serialize sequences with unknown length.

impl Serialize for Signed<Transaction> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let mut state = serializer.serialize_struct("SignedTxEip1559", 10)?;

        let tx = &self.signed;

        state.serialize_field("chain_id", &tx.chain_id)?;
        state.serialize_field("nonce", &tx.nonce)?;
        state.serialize_field("max_fee_per_gas", &tx.max_fee_per_gas)?;
        state.serialize_field("max_priority_fee_per_gas", &tx.max_priority_fee_per_gas)?;
        state.serialize_field("gas_limit", &tx.gas_limit)?;
        state.serialize_field("to", &tx.to)?;
        state.serialize_field("value", &tx.value)?;
        state.serialize_field("access_list", &tx.access_list)?;
        state.serialize_field("input", &tx.input.to_vec())?;
        state.serialize_field("signature", &self.signature)?;

        state.end()
    }
}

impl<'de> Deserialize<'de> for Signed<Transaction> {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        const FIELDS: &[&str] = &[
            "chain_id",
            "nonce",
            "max_fee_per_gas",
            "max_priority_fee_per_gas",
            "gas_limit",
            "to",
            "value",
            "access_list",
            "input",
            "signature",
        ];

        struct SignedTxEip1559Visitor;

        impl<'de> Visitor<'de> for SignedTxEip1559Visitor {
            type Value = Signed<Transaction>;

            fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
                formatter.write_str("struct SignedTxEip1559")
            }

            fn visit_map<M>(self, mut map: M) -> Result<Self::Value, M::Error>
            where
                M: MapAccess<'de>,
            {
                let mut chain_id = None;
                let mut nonce = None;
                let mut max_fee_per_gas = None;
                let mut max_priority_fee_per_gas = None;
                let mut gas_limit = None;
                let mut to = None;
                let mut value = None;
                let mut access_list = None;
                let mut input = None;
                let mut signature: Option<PrimitiveSignature> = None;

                // Extract fields by name
                while let Some(key) = map.next_key::<String>()? {
                    match key.as_str() {
                        "chain_id" => {
                            if chain_id.is_some() {
                                return Err(de::Error::duplicate_field("chain_id"));
                            }
                            chain_id = Some(map.next_value()?);
                        }
                        "nonce" => {
                            if nonce.is_some() {
                                return Err(de::Error::duplicate_field("nonce"));
                            }
                            nonce = Some(map.next_value()?);
                        }
                        "max_fee_per_gas" => {
                            if max_fee_per_gas.is_some() {
                                return Err(de::Error::duplicate_field("max_fee_per_gas"));
                            }
                            max_fee_per_gas = Some(map.next_value()?);
                        }
                        "max_priority_fee_per_gas" => {
                            if max_priority_fee_per_gas.is_some() {
                                return Err(de::Error::duplicate_field("max_priority_fee_per_gas"));
                            }
                            max_priority_fee_per_gas = Some(map.next_value()?);
                        }
                        "gas_limit" => {
                            if gas_limit.is_some() {
                                return Err(de::Error::duplicate_field("gas_limit"));
                            }
                            gas_limit = Some(map.next_value()?);
                        }
                        "to" => {
                            if to.is_some() {
                                return Err(de::Error::duplicate_field("to"));
                            }
                            to = Some(map.next_value()?);
                        }
                        "value" => {
                            if value.is_some() {
                                return Err(de::Error::duplicate_field("value"));
                            }
                            value = Some(map.next_value()?);
                        }
                        "access_list" => {
                            if access_list.is_some() {
                                return Err(de::Error::duplicate_field("access_list"));
                            }
                            access_list = Some(map.next_value()?);
                        }
                        "input" => {
                            if input.is_some() {
                                return Err(de::Error::duplicate_field("input"));
                            }
                            input = Some(map.next_value()?);
                        }
                        "signature" => {
                            if signature.is_some() {
                                return Err(de::Error::duplicate_field("signature"));
                            }
                            signature = Some(map.next_value()?);
                        }
                        _ => return Err(de::Error::unknown_field(&key, FIELDS)),
                    }
                }

                let chain_id = chain_id.ok_or_else(|| de::Error::missing_field("chain_id"))?;
                let nonce = nonce.ok_or_else(|| de::Error::missing_field("nonce"))?;
                let max_fee_per_gas =
                    max_fee_per_gas.ok_or_else(|| de::Error::missing_field("max_fee_per_gas"))?;
                let max_priority_fee_per_gas = max_priority_fee_per_gas
                    .ok_or_else(|| de::Error::missing_field("max_priority_fee_per_gas"))?;
                let gas_limit = gas_limit.ok_or_else(|| de::Error::missing_field("gas_limit"))?;
                let to = to.ok_or_else(|| de::Error::missing_field("to"))?;
                let value = value.ok_or_else(|| de::Error::missing_field("value"))?;
                let access_list =
                    access_list.ok_or_else(|| de::Error::missing_field("access_list"))?;
                let input = input.ok_or_else(|| de::Error::missing_field("input"))?;
                let signature = signature.ok_or_else(|| de::Error::missing_field("signature"))?;

                let tx = Transaction {
                    chain_id,
                    nonce,
                    max_fee_per_gas,
                    max_priority_fee_per_gas,
                    gas_limit,
                    to,
                    value,
                    access_list,
                    input,
                };

                let tx_hash = tx.signature_hash();
                let signer = alloy_consensus::Signed::new_unchecked(tx.clone(), signature, tx_hash)
                    .recover_signer()
                    .map_err(serde::de::Error::custom)?;

                Ok(Signed {
                    signed: tx,
                    signature,
                    signer,
                    _private: (),
                })
            }

            fn visit_seq<S>(self, mut seq: S) -> Result<Self::Value, S::Error>
            where
                S: de::SeqAccess<'de>,
            {
                // Read values in order, matching the field order from FIELDS
                let chain_id = seq
                    .next_element()?
                    .ok_or_else(|| de::Error::invalid_length(0, &"chain_id field"))?;

                let nonce = seq
                    .next_element()?
                    .ok_or_else(|| de::Error::invalid_length(1, &"nonce field"))?;

                let max_fee_per_gas = seq
                    .next_element()?
                    .ok_or_else(|| de::Error::invalid_length(2, &"max_fee_per_gas field"))?;

                let max_priority_fee_per_gas = seq.next_element()?.ok_or_else(|| {
                    de::Error::invalid_length(3, &"max_priority_fee_per_gas field")
                })?;

                let gas_limit = seq
                    .next_element()?
                    .ok_or_else(|| de::Error::invalid_length(4, &"gas_limit field"))?;

                let to = seq
                    .next_element()?
                    .ok_or_else(|| de::Error::invalid_length(5, &"to field"))?;

                let value = seq
                    .next_element()?
                    .ok_or_else(|| de::Error::invalid_length(6, &"value field"))?;

                let access_list = seq
                    .next_element()?
                    .ok_or_else(|| de::Error::invalid_length(7, &"access_list field"))?;

                let input = seq
                    .next_element()?
                    .ok_or_else(|| de::Error::invalid_length(8, &"input field"))?;

                let signature: PrimitiveSignature = seq
                    .next_element()?
                    .ok_or_else(|| de::Error::invalid_length(9, &"signature field"))?;

                let tx = Transaction {
                    chain_id,
                    nonce,
                    max_fee_per_gas,
                    max_priority_fee_per_gas,
                    gas_limit,
                    to,
                    value,
                    access_list,
                    input,
                };

                let tx_hash = tx.signature_hash();
                let signer = alloy_consensus::Signed::new_unchecked(tx.clone(), signature, tx_hash)
                    .recover_signer()
                    .map_err(serde::de::Error::custom)?;

                Ok(Signed {
                    signed: tx,
                    signature,
                    signer,
                    _private: (),
                })
            }
        }

        deserializer.deserialize_struct("SignedTxEip1559", FIELDS, SignedTxEip1559Visitor)
    }
}

impl<T: Hashable> Deref for Signed<T> {
    type Target = T;

    fn deref(&self) -> &Self::Target {
        &self.signed
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
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct UncheckedSigned<T: Hashable> {
    pub signed: T,
    pub signature: PrimitiveSignature,
    pub signer: Address,
    _private: (), // to prevent construction outside of this module
}

impl From<Signed<Transaction>> for UncheckedSigned<Transaction> {
    fn from(signed: Signed<Transaction>) -> Self {
        UncheckedSigned {
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
        // Make a "blind" Signed structure that does *not* re-check
        Signed {
            signed: self.signed,
            signature: self.signature,
            signer: self.signer,
            _private: (),
        }
    }
}

impl Serialize for UncheckedSigned<Transaction> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let mut state = serializer.serialize_struct("UncheckedSignedTxEip1559", 11)?;

        let tx = &self.signed;

        state.serialize_field("chain_id", &tx.chain_id)?;
        state.serialize_field("nonce", &tx.nonce)?;
        state.serialize_field("max_fee_per_gas", &tx.max_fee_per_gas)?;
        state.serialize_field("max_priority_fee_per_gas", &tx.max_priority_fee_per_gas)?;
        state.serialize_field("gas_limit", &tx.gas_limit)?;
        state.serialize_field("to", &tx.to)?;
        state.serialize_field("value", &tx.value)?;
        state.serialize_field("access_list", &tx.access_list)?;
        state.serialize_field("input", &tx.input.to_vec())?;
        state.serialize_field("signature", &self.signature)?;
        state.serialize_field("signer", &self.signer)?;

        state.end()
    }
}

impl<'de> Deserialize<'de> for UncheckedSigned<Transaction> {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        const FIELDS: &[&str] = &[
            "chain_id",
            "nonce",
            "max_fee_per_gas",
            "max_priority_fee_per_gas",
            "gas_limit",
            "to",
            "value",
            "access_list",
            "input",
            "signature",
            "signer",
        ];

        struct UncheckedSignedTxEip1559Visitor;

        impl<'de> Visitor<'de> for UncheckedSignedTxEip1559Visitor {
            type Value = UncheckedSigned<Transaction>;

            fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
                formatter.write_str("struct UncheckedSignedTxEip1559")
            }

            fn visit_map<M>(self, mut map: M) -> Result<Self::Value, M::Error>
            where
                M: MapAccess<'de>,
            {
                let mut chain_id = None;
                let mut nonce = None;
                let mut max_fee_per_gas = None;
                let mut max_priority_fee_per_gas = None;
                let mut gas_limit = None;
                let mut to = None;
                let mut value = None;
                let mut access_list = None;
                let mut input = None;
                let mut signature: Option<PrimitiveSignature> = None;
                let mut signer = None;

                // Extract fields by name
                while let Some(key) = map.next_key::<String>()? {
                    match key.as_str() {
                        "chain_id" => {
                            if chain_id.is_some() {
                                return Err(de::Error::duplicate_field("chain_id"));
                            }
                            chain_id = Some(map.next_value()?);
                        }
                        "nonce" => {
                            if nonce.is_some() {
                                return Err(de::Error::duplicate_field("nonce"));
                            }
                            nonce = Some(map.next_value()?);
                        }
                        "max_fee_per_gas" => {
                            if max_fee_per_gas.is_some() {
                                return Err(de::Error::duplicate_field("max_fee_per_gas"));
                            }
                            max_fee_per_gas = Some(map.next_value()?);
                        }
                        "max_priority_fee_per_gas" => {
                            if max_priority_fee_per_gas.is_some() {
                                return Err(de::Error::duplicate_field("max_priority_fee_per_gas"));
                            }
                            max_priority_fee_per_gas = Some(map.next_value()?);
                        }
                        "gas_limit" => {
                            if gas_limit.is_some() {
                                return Err(de::Error::duplicate_field("gas_limit"));
                            }
                            gas_limit = Some(map.next_value()?);
                        }
                        "to" => {
                            if to.is_some() {
                                return Err(de::Error::duplicate_field("to"));
                            }
                            to = Some(map.next_value()?);
                        }
                        "value" => {
                            if value.is_some() {
                                return Err(de::Error::duplicate_field("value"));
                            }
                            value = Some(map.next_value()?);
                        }
                        "access_list" => {
                            if access_list.is_some() {
                                return Err(de::Error::duplicate_field("access_list"));
                            }
                            access_list = Some(map.next_value()?);
                        }
                        "input" => {
                            if input.is_some() {
                                return Err(de::Error::duplicate_field("input"));
                            }
                            input = Some(map.next_value()?);
                        }
                        "signature" => {
                            if signature.is_some() {
                                return Err(de::Error::duplicate_field("signature"));
                            }
                            signature = Some(map.next_value()?);
                        }
                        "signer" => {
                            if signer.is_some() {
                                return Err(de::Error::duplicate_field("signer"));
                            }
                            signer = Some(map.next_value()?);
                        }
                        _ => return Err(de::Error::unknown_field(&key, FIELDS)),
                    }
                }

                let chain_id = chain_id.ok_or_else(|| de::Error::missing_field("chain_id"))?;
                let nonce = nonce.ok_or_else(|| de::Error::missing_field("nonce"))?;
                let max_fee_per_gas =
                    max_fee_per_gas.ok_or_else(|| de::Error::missing_field("max_fee_per_gas"))?;
                let max_priority_fee_per_gas = max_priority_fee_per_gas
                    .ok_or_else(|| de::Error::missing_field("max_priority_fee_per_gas"))?;
                let gas_limit = gas_limit.ok_or_else(|| de::Error::missing_field("gas_limit"))?;
                let to = to.ok_or_else(|| de::Error::missing_field("to"))?;
                let value = value.ok_or_else(|| de::Error::missing_field("value"))?;
                let access_list =
                    access_list.ok_or_else(|| de::Error::missing_field("access_list"))?;
                let input = input.ok_or_else(|| de::Error::missing_field("input"))?;
                let signature = signature.ok_or_else(|| de::Error::missing_field("signature"))?;
                let signer = signer.ok_or_else(|| de::Error::missing_field("signer"))?;

                let tx = Transaction {
                    chain_id,
                    nonce,
                    max_fee_per_gas,
                    max_priority_fee_per_gas,
                    gas_limit,
                    to,
                    value,
                    access_list,
                    input,
                };

                Ok(UncheckedSigned {
                    signed: tx,
                    signature,
                    signer,
                    _private: (),
                })
            }

            fn visit_seq<S>(self, mut seq: S) -> Result<Self::Value, S::Error>
            where
                S: de::SeqAccess<'de>,
            {
                // Read values in order, matching the field order from FIELDS
                let chain_id = seq
                    .next_element()?
                    .ok_or_else(|| de::Error::invalid_length(0, &"chain_id field"))?;

                let nonce = seq
                    .next_element()?
                    .ok_or_else(|| de::Error::invalid_length(1, &"nonce field"))?;

                let max_fee_per_gas = seq
                    .next_element()?
                    .ok_or_else(|| de::Error::invalid_length(2, &"max_fee_per_gas field"))?;

                let max_priority_fee_per_gas = seq.next_element()?.ok_or_else(|| {
                    de::Error::invalid_length(3, &"max_priority_fee_per_gas field")
                })?;

                let gas_limit = seq
                    .next_element()?
                    .ok_or_else(|| de::Error::invalid_length(4, &"gas_limit field"))?;

                let to = seq
                    .next_element()?
                    .ok_or_else(|| de::Error::invalid_length(5, &"to field"))?;

                let value = seq
                    .next_element()?
                    .ok_or_else(|| de::Error::invalid_length(6, &"value field"))?;

                let access_list = seq
                    .next_element()?
                    .ok_or_else(|| de::Error::invalid_length(7, &"access_list field"))?;

                let input = seq
                    .next_element()?
                    .ok_or_else(|| de::Error::invalid_length(8, &"input field"))?;

                let signature: PrimitiveSignature = seq
                    .next_element()?
                    .ok_or_else(|| de::Error::invalid_length(9, &"signature field"))?;

                let signer = seq
                    .next_element()?
                    .ok_or_else(|| de::Error::invalid_length(10, &"signer field"))?;

                let tx = Transaction {
                    chain_id,
                    nonce,
                    max_fee_per_gas,
                    max_priority_fee_per_gas,
                    gas_limit,
                    to,
                    value,
                    access_list,
                    input,
                };

                Ok(UncheckedSigned {
                    signed: tx,
                    signature,
                    signer,
                    _private: (),
                })
            }
        }

        deserializer.deserialize_struct(
            "UncheckedSignedTxEip1559",
            FIELDS,
            UncheckedSignedTxEip1559Visitor,
        )
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
