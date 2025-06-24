use alloy_consensus::{
    SignableTransaction, TxEip1559, TxEip2930, TxEnvelope, TxLegacy, TypedTransaction,
};
use alloy_primitives::{Address, PrimitiveSignature, TxKind};
use alloy_rpc_types::AccessList;
use alloy_sol_types::SolValue;
use anyhow::Result;
use async_trait::async_trait;
use serde::{
    Deserialize, Deserializer, Serialize, Serializer,
    de::{self, MapAccess, Visitor},
    ser::SerializeStruct,
};

use crate::cryptography::hash::{Hash, Hashable};
use crate::cryptography::merkle_tree::{MerkleBuilder, Merkleizable};
use alloy_consensus::Signed as ConsensusSigned;

#[async_trait]
pub trait Signer {
    async fn sign_tx<T: SignableTransaction<PrimitiveSignature> + Clone + IntoEnvelope>(
        &self,
        tx: &T,
    ) -> Result<TxEnvelope>;
}

pub trait IntoEnvelope {
    fn into_envelope(self, signature: PrimitiveSignature) -> Result<TxEnvelope>;
}

impl IntoEnvelope for TxLegacy {
    fn into_envelope(self, signature: PrimitiveSignature) -> Result<TxEnvelope> {
        let signature_hash = self.signature_hash();
        let signed_tx = ConsensusSigned::new_unchecked(self, signature, signature_hash);
        Ok(TxEnvelope::Legacy(signed_tx))
    }
}

impl IntoEnvelope for TxEip1559 {
    fn into_envelope(self, signature: PrimitiveSignature) -> Result<TxEnvelope> {
        let signature_hash = self.signature_hash();
        let signed_tx = ConsensusSigned::new_unchecked(self, signature, signature_hash);
        Ok(TxEnvelope::Eip1559(signed_tx))
    }
}

impl IntoEnvelope for TxEip2930 {
    fn into_envelope(self, signature: PrimitiveSignature) -> Result<TxEnvelope> {
        let signature_hash = self.signature_hash();
        let signed_tx = ConsensusSigned::new_unchecked(self, signature, signature_hash);
        Ok(TxEnvelope::Eip2930(signed_tx))
    }
}

#[async_trait]
impl<S> Signer for S
where
    S: alloy_signer::Signer<PrimitiveSignature> + Send + Sync,
{
    async fn sign_tx<T: SignableTransaction<PrimitiveSignature> + Clone + IntoEnvelope>(
        &self,
        tx: &T,
    ) -> Result<TxEnvelope> {
        let signature_hash = tx.signature_hash();
        let signature = self.sign_hash(&signature_hash).await?;
        Ok(tx.clone().into_envelope(signature)?)
    }
}

pub trait SignerSync {
    fn sign_tx_sync<T: SignableTransaction<PrimitiveSignature> + Clone + IntoEnvelope>(
        &self,
        tx: &T,
    ) -> Result<TxEnvelope>;
}

impl<S> SignerSync for S
where
    S: alloy_signer::SignerSync<PrimitiveSignature> + Send + Sync,
    S: alloy_signer::Signer<PrimitiveSignature> + Send + Sync,
{
    fn sign_tx_sync<T: SignableTransaction<PrimitiveSignature> + Clone + IntoEnvelope>(
        &self,
        tx: &T,
    ) -> Result<TxEnvelope> {
        let signature_hash = tx.signature_hash();
        let signature = self.sign_hash_sync(&signature_hash)?;
        Ok(tx.clone().into_envelope(signature)?)
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct UncheckedSigned {
    pub tx: TypedTransaction,
    pub signature: PrimitiveSignature,
    pub signer: Address,
}

impl UncheckedSigned {
    pub fn new(tx: TypedTransaction, signature: PrimitiveSignature, signer: Address) -> Self {
        Self {
            tx,
            signature,
            signer,
        }
    }

    /// Convert to a TxEnvelope (signed transaction)
    pub fn into_envelope(self) -> TxEnvelope {
        match self.tx {
            TypedTransaction::Legacy(tx) => {
                let tx_clone = tx.clone();
                let signed = alloy_consensus::Signed::new_unchecked(
                    tx,
                    self.signature,
                    tx_clone.signature_hash(),
                );
                TxEnvelope::Legacy(signed)
            }
            TypedTransaction::Eip2930(tx) => {
                let tx_clone = tx.clone();
                let signed = alloy_consensus::Signed::new_unchecked(
                    tx,
                    self.signature,
                    tx_clone.signature_hash(),
                );
                TxEnvelope::Eip2930(signed)
            }
            TypedTransaction::Eip1559(tx) => {
                let tx_clone = tx.clone();
                let signed = alloy_consensus::Signed::new_unchecked(
                    tx,
                    self.signature,
                    tx_clone.signature_hash(),
                );
                TxEnvelope::Eip1559(signed)
            }
            TypedTransaction::Eip4844(tx) => {
                let tx_clone = tx.clone();
                let signed = alloy_consensus::Signed::new_unchecked(
                    tx,
                    self.signature,
                    tx_clone.signature_hash(),
                );
                TxEnvelope::Eip4844(signed)
            }
            TypedTransaction::Eip7702(tx) => {
                let tx_clone = tx.clone();
                let signed = alloy_consensus::Signed::new_unchecked(
                    tx,
                    self.signature,
                    tx_clone.signature_hash(),
                );
                TxEnvelope::Eip7702(signed)
            }
        }
    }
}

impl From<TxEnvelope> for UncheckedSigned {
    fn from(env: TxEnvelope) -> Self {
        match env {
            TxEnvelope::Legacy(signed) => Self {
                tx: TypedTransaction::Legacy(signed.tx().clone()),
                signature: signed.signature().clone(),
                signer: signed.recover_signer().unwrap_or(Address::ZERO),
            },
            TxEnvelope::Eip2930(signed) => Self {
                tx: TypedTransaction::Eip2930(signed.tx().clone()),
                signature: signed.signature().clone(),
                signer: signed.recover_signer().unwrap_or(Address::ZERO),
            },
            TxEnvelope::Eip1559(signed) => Self {
                tx: TypedTransaction::Eip1559(signed.tx().clone()),
                signature: signed.signature().clone(),
                signer: signed.recover_signer().unwrap_or(Address::ZERO),
            },
            TxEnvelope::Eip4844(signed) => Self {
                tx: TypedTransaction::Eip4844(signed.tx().clone()),
                signature: signed.signature().clone(),
                signer: signed.recover_signer().unwrap_or(Address::ZERO),
            },
            TxEnvelope::Eip7702(signed) => Self {
                tx: TypedTransaction::Eip7702(signed.tx().clone()),
                signature: signed.signature().clone(),
                signer: signed.recover_signer().unwrap_or(Address::ZERO),
            },
        }
    }
}

impl Hashable for UncheckedSigned {
    fn hash_custom(&self) -> Hash {
        self.clone().into_envelope().hash_custom()
    }
}

impl Merkleizable for UncheckedSigned {
    fn append_leaves(&self, builder: &mut MerkleBuilder) {
        match &self.tx {
            TypedTransaction::Legacy(tx) => {
                match tx.to {
                    TxKind::Call(to) => {
                        builder.add_field("to", to.hash_custom());
                    }
                    TxKind::Create => {
                        builder.add_field("to", Address::ZERO.hash_custom());
                    }
                }
                builder.add_field("nonce", tx.nonce.abi_encode().hash_custom());
                builder.add_field("value", tx.value.abi_encode().hash_custom());
                builder.add_field("gas_limit", tx.gas_limit.abi_encode().hash_custom());
                builder.add_field("gas_price", tx.gas_price.abi_encode().hash_custom());
                builder.add_field("call_data", tx.input.hash_custom());
            }
            TypedTransaction::Eip2930(tx) => {
                match tx.to {
                    TxKind::Call(to) => {
                        builder.add_field("to", to.hash_custom());
                    }
                    TxKind::Create => {
                        builder.add_field("to", Address::ZERO.hash_custom());
                    }
                }
                builder.add_field("nonce", tx.nonce.abi_encode().hash_custom());
                builder.add_field("value", tx.value.abi_encode().hash_custom());
                builder.add_field("gas_limit", tx.gas_limit.abi_encode().hash_custom());
                builder.add_field("gas_price", tx.gas_price.abi_encode().hash_custom());
                builder.add_field("call_data", tx.input.hash_custom());
                // TODO: figure out how to handle access list
            }
            TypedTransaction::Eip1559(tx) => {
                match tx.to {
                    TxKind::Call(to) => {
                        builder.add_field("to", to.hash_custom());
                    }
                    TxKind::Create => {
                        builder.add_field("to", Address::ZERO.hash_custom());
                    }
                }
                builder.add_field("nonce", tx.nonce.abi_encode().hash_custom());
                builder.add_field("value", tx.value.abi_encode().hash_custom());
                builder.add_field("gas_limit", tx.gas_limit.abi_encode().hash_custom());
                builder.add_field("call_data", tx.input.hash_custom());
                builder.add_field(
                    "max_fee_per_gas",
                    tx.max_fee_per_gas.abi_encode().hash_custom(),
                );
                builder.add_field(
                    "max_priority_fee_per_gas",
                    tx.max_priority_fee_per_gas.abi_encode().hash_custom(),
                );
                // TODO: figure out how to handle access list
            }
            TypedTransaction::Eip4844(_tx) => {
                panic!("EIP-4844 transactions not yet supported")
            }
            TypedTransaction::Eip7702(_tx) => {
                panic!("EIP-7702 transactions not yet supported")
            }
        }
    }
}

// Wrapper struct for TxEnvelope serialization
// This allows us to implement custom serde without touching the alloy type
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TxEnvelopeWrapper(pub TxEnvelope);

impl From<TxEnvelope> for TxEnvelopeWrapper {
    fn from(envelope: TxEnvelope) -> Self {
        TxEnvelopeWrapper(envelope)
    }
}

impl From<TxEnvelopeWrapper> for TxEnvelope {
    fn from(wrapper: TxEnvelopeWrapper) -> Self {
        wrapper.0
    }
}

// Custom serialization for TxEnvelopeWrapper
// We serialize transaction data and signature, but recover signer during deserialization
impl Serialize for TxEnvelopeWrapper {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        match &self.0 {
            TxEnvelope::Legacy(signed_tx) => {
                let mut state = serializer.serialize_struct("TxEnvelopeLegacy", 8)?;
                let tx = signed_tx.tx();

                state.serialize_field("tx_type", "legacy")?;
                state.serialize_field("chain_id", &tx.chain_id)?;
                state.serialize_field("nonce", &tx.nonce)?;
                state.serialize_field("gas_price", &tx.gas_price)?;
                state.serialize_field("gas_limit", &tx.gas_limit)?;
                state.serialize_field("to", &tx.to)?;
                state.serialize_field("value", &tx.value)?;
                state.serialize_field("input", &tx.input.to_vec())?;
                state.serialize_field("signature", signed_tx.signature())?;

                state.end()
            }
            TxEnvelope::Eip1559(signed_tx) => {
                let mut state = serializer.serialize_struct("TxEnvelopeEip1559", 9)?;
                let tx = signed_tx.tx();

                state.serialize_field("tx_type", "eip1559")?;
                state.serialize_field("chain_id", &tx.chain_id)?;
                state.serialize_field("nonce", &tx.nonce)?;
                state.serialize_field("max_fee_per_gas", &tx.max_fee_per_gas)?;
                state.serialize_field("max_priority_fee_per_gas", &tx.max_priority_fee_per_gas)?;
                state.serialize_field("gas_limit", &tx.gas_limit)?;
                state.serialize_field("to", &tx.to)?;
                state.serialize_field("value", &tx.value)?;
                state.serialize_field("input", &tx.input.to_vec())?;
                state.serialize_field("signature", signed_tx.signature())?;

                state.end()
            }
            TxEnvelope::Eip2930(signed_tx) => {
                let mut state = serializer.serialize_struct("TxEnvelopeEip2930", 9)?;
                let tx = signed_tx.tx();

                state.serialize_field("tx_type", "eip2930")?;
                state.serialize_field("chain_id", &tx.chain_id)?;
                state.serialize_field("nonce", &tx.nonce)?;
                state.serialize_field("gas_price", &tx.gas_price)?;
                state.serialize_field("gas_limit", &tx.gas_limit)?;
                state.serialize_field("to", &tx.to)?;
                state.serialize_field("value", &tx.value)?;
                state.serialize_field("input", &tx.input.to_vec())?;
                state.serialize_field("signature", signed_tx.signature())?;

                state.end()
            }
            TxEnvelope::Eip4844(_) => {
                return Err(serde::ser::Error::custom(
                    "EIP-4844 transactions not yet supported",
                ));
            }
            TxEnvelope::Eip7702(_) => {
                return Err(serde::ser::Error::custom(
                    "EIP-7702 transactions not yet supported",
                ));
            }
        }
    }
}

impl<'de> Deserialize<'de> for TxEnvelopeWrapper {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct TxEnvelopeVisitor;

        impl<'de> Visitor<'de> for TxEnvelopeVisitor {
            type Value = TxEnvelopeWrapper;

            fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
                formatter.write_str("struct TxEnvelope")
            }

            fn visit_map<M>(self, mut map: M) -> Result<Self::Value, M::Error>
            where
                M: MapAccess<'de>,
            {
                let mut tx_type: Option<String> = None;
                let mut chain_id: Option<u64> = None;
                let mut nonce: Option<u64> = None;
                let mut gas_price: Option<u128> = None;
                let mut max_fee_per_gas: Option<u128> = None;
                let mut max_priority_fee_per_gas: Option<u128> = None;
                let mut gas_limit: Option<u128> = None;
                let mut to: Option<TxKind> = None;
                let mut value: Option<alloy_primitives::U256> = None;
                let mut input: Option<Vec<u8>> = None;
                let mut signature: Option<PrimitiveSignature> = None;

                while let Some(key) = map.next_key::<String>()? {
                    match key.as_str() {
                        "tx_type" => {
                            if tx_type.is_some() {
                                return Err(de::Error::duplicate_field("tx_type"));
                            }
                            tx_type = Some(map.next_value()?);
                        }
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
                        "gas_price" => {
                            if gas_price.is_some() {
                                return Err(de::Error::duplicate_field("gas_price"));
                            }
                            gas_price = Some(map.next_value()?);
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
                        _ => return Err(de::Error::unknown_field(&key, &[])),
                    }
                }

                let tx_type = tx_type.ok_or_else(|| de::Error::missing_field("tx_type"))?;
                let chain_id = chain_id.ok_or_else(|| de::Error::missing_field("chain_id"))?;
                let nonce = nonce.ok_or_else(|| de::Error::missing_field("nonce"))?;
                let gas_limit = gas_limit.ok_or_else(|| de::Error::missing_field("gas_limit"))?;
                let to = to.ok_or_else(|| de::Error::missing_field("to"))?;
                let value = value.ok_or_else(|| de::Error::missing_field("value"))?;
                let input = input.ok_or_else(|| de::Error::missing_field("input"))?;
                let signature = signature.ok_or_else(|| de::Error::missing_field("signature"))?;

                let envelope = match tx_type.as_str() {
                    "legacy" => {
                        let gas_price =
                            gas_price.ok_or_else(|| de::Error::missing_field("gas_price"))?;
                        let tx = TxLegacy {
                            chain_id: Some(chain_id),
                            nonce,
                            gas_price,
                            gas_limit: gas_limit as u64,
                            to,
                            value,
                            input: input.into(),
                        };
                        let signature_hash = tx.signature_hash();
                        let signed_tx =
                            ConsensusSigned::new_unchecked(tx, signature, signature_hash);
                        TxEnvelope::Legacy(signed_tx)
                    }
                    "eip1559" => {
                        let max_fee_per_gas = max_fee_per_gas
                            .ok_or_else(|| de::Error::missing_field("max_fee_per_gas"))?;
                        let max_priority_fee_per_gas = max_priority_fee_per_gas
                            .ok_or_else(|| de::Error::missing_field("max_priority_fee_per_gas"))?;
                        let tx = TxEip1559 {
                            chain_id,
                            nonce,
                            max_fee_per_gas,
                            max_priority_fee_per_gas,
                            gas_limit: gas_limit as u64,
                            to,
                            value,
                            input: input.into(),
                            access_list: AccessList::default(),
                        };
                        let signature_hash = tx.signature_hash();
                        let signed_tx =
                            ConsensusSigned::new_unchecked(tx, signature, signature_hash);
                        TxEnvelope::Eip1559(signed_tx)
                    }
                    "eip2930" => {
                        let gas_price =
                            gas_price.ok_or_else(|| de::Error::missing_field("gas_price"))?;
                        let tx = TxEip2930 {
                            chain_id,
                            nonce,
                            gas_price,
                            gas_limit: gas_limit as u64,
                            to,
                            value,
                            input: input.into(),
                            access_list: AccessList::default(),
                        };
                        let signature_hash = tx.signature_hash();
                        let signed_tx =
                            ConsensusSigned::new_unchecked(tx, signature, signature_hash);
                        TxEnvelope::Eip2930(signed_tx)
                    }
                    _ => {
                        return Err(de::Error::custom(format!(
                            "Unsupported transaction type: {}",
                            tx_type
                        )));
                    }
                };

                Ok(TxEnvelopeWrapper(envelope))
            }
        }

        deserializer.deserialize_struct("TxEnvelope", &[], TxEnvelopeVisitor)
    }
}
