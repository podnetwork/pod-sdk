use alloy_consensus::{
    SignableTransaction, TxEip1559, TxEnvelope, TxLegacy, Typed2718,
    private::{alloy_eips, alloy_rlp},
    transaction::{RlpEcdsaEncodableTx, Transaction as AlloyTransaction},
};
use alloy_eips::eip2930::AccessList;
use alloy_eips::eip7702::SignedAuthorization;
use alloy_primitives::{Address, B256, Bytes, ChainId, Signature, TxHash, TxKind, U256};
use alloy_rlp::{BufMut, Decodable, Header};
use alloy_sol_types::SolValue;
use serde::{Deserialize, Serialize};

use crate::cryptography::{
    hash::{Hash, Hashable},
    merkle_tree::{MerkleBuilder, Merkleizable},
};

/// Transactions accepted by pod. Deliberately limited to legacy (EIP-155) and
/// EIP-1559 — EIP-2930/4844/7702 are rejected at decode boundaries.
///
/// We define our own enum (rather than aliasing
/// `alloy_consensus::TypedTransaction`) so that the type system carries
/// exactly the variants pod supports: every `match` is exhaustive without
/// needing dead `unreachable!()` arms.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "arbitrary", derive(arbitrary::Arbitrary))]
pub enum Transaction {
    Legacy(TxLegacy),
    Eip1559(TxEip1559),
}

impl Default for Transaction {
    fn default() -> Self {
        Self::Eip1559(TxEip1559::default())
    }
}

impl From<TxLegacy> for Transaction {
    fn from(tx: TxLegacy) -> Self {
        Self::Legacy(tx)
    }
}

impl From<TxEip1559> for Transaction {
    fn from(tx: TxEip1559) -> Self {
        Self::Eip1559(tx)
    }
}

impl Transaction {
    /// Wrap into a signed [`TxEnvelope`] using the provided signature. Used
    /// when re-emitting a tx in standard EIP-2718 form (RPC rendering, raw
    /// envelope encoding, etc.).
    pub fn into_envelope(self, signature: Signature) -> TxEnvelope {
        match self {
            Self::Legacy(tx) => TxEnvelope::Legacy(tx.into_signed(signature)),
            Self::Eip1559(tx) => TxEnvelope::Eip1559(tx.into_signed(signature)),
        }
    }

    /// Decode a tagged unsigned transaction blob written by pod's append-log /
    /// DB persistence layer: a single type byte (`0x00` legacy, `0x02` 1559)
    /// followed by the variant-specific RLP fields.
    pub fn decode_unsigned(buf: &mut &[u8]) -> alloy_rlp::Result<Self> {
        if buf.is_empty() {
            return Err(alloy_rlp::Error::InputTooShort);
        }
        let first = buf[0];
        // Legacy txs may also be stored bare (RLP list, no type byte) in some
        // call sites; accept that for symmetry with `TypedTransaction::decode_unsigned`.
        if first >= 0xc0 {
            return Ok(Self::Legacy(TxLegacy::decode(buf)?));
        }
        let ty = buf[0];
        *buf = &buf[1..];
        match ty {
            0x00 => Ok(Self::Legacy(TxLegacy::decode(buf)?)),
            0x02 => Ok(Self::Eip1559(TxEip1559::decode(buf)?)),
            _ => Err(alloy_rlp::Error::Custom(
                "unsupported tx type — pod accepts legacy + EIP-1559 only",
            )),
        }
    }
}

impl Typed2718 for Transaction {
    fn ty(&self) -> u8 {
        match self {
            Self::Legacy(tx) => tx.ty(),
            Self::Eip1559(tx) => tx.ty(),
        }
    }
}

impl AlloyTransaction for Transaction {
    fn chain_id(&self) -> Option<ChainId> {
        match self {
            Self::Legacy(tx) => AlloyTransaction::chain_id(tx),
            Self::Eip1559(tx) => AlloyTransaction::chain_id(tx),
        }
    }

    fn nonce(&self) -> u64 {
        match self {
            Self::Legacy(tx) => AlloyTransaction::nonce(tx),
            Self::Eip1559(tx) => AlloyTransaction::nonce(tx),
        }
    }

    fn gas_limit(&self) -> u64 {
        match self {
            Self::Legacy(tx) => AlloyTransaction::gas_limit(tx),
            Self::Eip1559(tx) => AlloyTransaction::gas_limit(tx),
        }
    }

    fn gas_price(&self) -> Option<u128> {
        match self {
            Self::Legacy(tx) => AlloyTransaction::gas_price(tx),
            Self::Eip1559(tx) => AlloyTransaction::gas_price(tx),
        }
    }

    fn max_fee_per_gas(&self) -> u128 {
        match self {
            Self::Legacy(tx) => AlloyTransaction::max_fee_per_gas(tx),
            Self::Eip1559(tx) => AlloyTransaction::max_fee_per_gas(tx),
        }
    }

    fn max_priority_fee_per_gas(&self) -> Option<u128> {
        match self {
            Self::Legacy(tx) => AlloyTransaction::max_priority_fee_per_gas(tx),
            Self::Eip1559(tx) => AlloyTransaction::max_priority_fee_per_gas(tx),
        }
    }

    fn max_fee_per_blob_gas(&self) -> Option<u128> {
        match self {
            Self::Legacy(tx) => AlloyTransaction::max_fee_per_blob_gas(tx),
            Self::Eip1559(tx) => AlloyTransaction::max_fee_per_blob_gas(tx),
        }
    }

    fn priority_fee_or_price(&self) -> u128 {
        match self {
            Self::Legacy(tx) => AlloyTransaction::priority_fee_or_price(tx),
            Self::Eip1559(tx) => AlloyTransaction::priority_fee_or_price(tx),
        }
    }

    fn effective_gas_price(&self, base_fee: Option<u64>) -> u128 {
        match self {
            Self::Legacy(tx) => AlloyTransaction::effective_gas_price(tx, base_fee),
            Self::Eip1559(tx) => AlloyTransaction::effective_gas_price(tx, base_fee),
        }
    }

    fn is_dynamic_fee(&self) -> bool {
        match self {
            Self::Legacy(tx) => AlloyTransaction::is_dynamic_fee(tx),
            Self::Eip1559(tx) => AlloyTransaction::is_dynamic_fee(tx),
        }
    }

    fn kind(&self) -> TxKind {
        match self {
            Self::Legacy(tx) => AlloyTransaction::kind(tx),
            Self::Eip1559(tx) => AlloyTransaction::kind(tx),
        }
    }

    fn is_create(&self) -> bool {
        match self {
            Self::Legacy(tx) => AlloyTransaction::is_create(tx),
            Self::Eip1559(tx) => AlloyTransaction::is_create(tx),
        }
    }

    fn value(&self) -> U256 {
        match self {
            Self::Legacy(tx) => AlloyTransaction::value(tx),
            Self::Eip1559(tx) => AlloyTransaction::value(tx),
        }
    }

    fn input(&self) -> &Bytes {
        match self {
            Self::Legacy(tx) => AlloyTransaction::input(tx),
            Self::Eip1559(tx) => AlloyTransaction::input(tx),
        }
    }

    fn access_list(&self) -> Option<&AccessList> {
        match self {
            Self::Legacy(tx) => AlloyTransaction::access_list(tx),
            Self::Eip1559(tx) => AlloyTransaction::access_list(tx),
        }
    }

    fn blob_versioned_hashes(&self) -> Option<&[B256]> {
        match self {
            Self::Legacy(tx) => AlloyTransaction::blob_versioned_hashes(tx),
            Self::Eip1559(tx) => AlloyTransaction::blob_versioned_hashes(tx),
        }
    }

    fn authorization_list(&self) -> Option<&[SignedAuthorization]> {
        match self {
            Self::Legacy(tx) => AlloyTransaction::authorization_list(tx),
            Self::Eip1559(tx) => AlloyTransaction::authorization_list(tx),
        }
    }
}

impl SignableTransaction<Signature> for Transaction {
    fn set_chain_id(&mut self, chain_id: ChainId) {
        match self {
            Self::Legacy(tx) => tx.set_chain_id(chain_id),
            Self::Eip1559(tx) => tx.set_chain_id(chain_id),
        }
    }

    fn encode_for_signing(&self, out: &mut dyn BufMut) {
        match self {
            Self::Legacy(tx) => tx.encode_for_signing(out),
            Self::Eip1559(tx) => tx.encode_for_signing(out),
        }
    }

    fn payload_len_for_signature(&self) -> usize {
        match self {
            Self::Legacy(tx) => tx.payload_len_for_signature(),
            Self::Eip1559(tx) => tx.payload_len_for_signature(),
        }
    }
}

impl RlpEcdsaEncodableTx for Transaction {
    fn rlp_encoded_fields_length(&self) -> usize {
        match self {
            Self::Legacy(tx) => tx.rlp_encoded_fields_length(),
            Self::Eip1559(tx) => tx.rlp_encoded_fields_length(),
        }
    }

    fn rlp_encode_fields(&self, out: &mut dyn BufMut) {
        match self {
            Self::Legacy(tx) => tx.rlp_encode_fields(out),
            Self::Eip1559(tx) => tx.rlp_encode_fields(out),
        }
    }

    fn rlp_header_signed(&self, signature: &Signature) -> Header {
        match self {
            Self::Legacy(tx) => tx.rlp_header_signed(signature),
            Self::Eip1559(tx) => tx.rlp_header_signed(signature),
        }
    }

    fn rlp_encoded_length_with_signature(&self, signature: &Signature) -> usize {
        match self {
            Self::Legacy(tx) => tx.rlp_encoded_length_with_signature(signature),
            Self::Eip1559(tx) => tx.rlp_encoded_length_with_signature(signature),
        }
    }

    fn rlp_encode_signed(&self, signature: &Signature, out: &mut dyn BufMut) {
        match self {
            Self::Legacy(tx) => tx.rlp_encode_signed(signature, out),
            Self::Eip1559(tx) => tx.rlp_encode_signed(signature, out),
        }
    }

    fn eip2718_encoded_length(&self, signature: &Signature) -> usize {
        match self {
            Self::Legacy(tx) => tx.eip2718_encoded_length(signature),
            Self::Eip1559(tx) => tx.eip2718_encoded_length(signature),
        }
    }

    fn eip2718_encode_with_type(&self, signature: &Signature, ty: u8, out: &mut dyn BufMut) {
        match self {
            Self::Legacy(tx) => tx.eip2718_encode_with_type(signature, ty, out),
            Self::Eip1559(tx) => tx.eip2718_encode_with_type(signature, ty, out),
        }
    }

    fn eip2718_encode(&self, signature: &Signature, out: &mut dyn BufMut) {
        match self {
            Self::Legacy(tx) => tx.eip2718_encode(signature, out),
            Self::Eip1559(tx) => tx.eip2718_encode(signature, out),
        }
    }

    fn network_header(&self, signature: &Signature) -> Header {
        match self {
            Self::Legacy(tx) => tx.network_header(signature),
            Self::Eip1559(tx) => tx.network_header(signature),
        }
    }

    fn network_encoded_length(&self, signature: &Signature) -> usize {
        match self {
            Self::Legacy(tx) => tx.network_encoded_length(signature),
            Self::Eip1559(tx) => tx.network_encoded_length(signature),
        }
    }

    fn network_encode_with_type(&self, signature: &Signature, ty: u8, out: &mut dyn BufMut) {
        match self {
            Self::Legacy(tx) => tx.network_encode_with_type(signature, ty, out),
            Self::Eip1559(tx) => tx.network_encode_with_type(signature, ty, out),
        }
    }

    fn network_encode(&self, signature: &Signature, out: &mut dyn BufMut) {
        match self {
            Self::Legacy(tx) => tx.network_encode(signature, out),
            Self::Eip1559(tx) => tx.network_encode(signature, out),
        }
    }

    fn tx_hash_with_type(&self, signature: &Signature, ty: u8) -> TxHash {
        match self {
            Self::Legacy(tx) => tx.tx_hash_with_type(signature, ty),
            Self::Eip1559(tx) => tx.tx_hash_with_type(signature, ty),
        }
    }

    fn tx_hash(&self, signature: &Signature) -> TxHash {
        match self {
            Self::Legacy(tx) => tx.tx_hash(signature),
            Self::Eip1559(tx) => tx.tx_hash(signature),
        }
    }
}

impl Hashable for Transaction {
    fn hash_custom(&self) -> Hash {
        self.signature_hash()
    }
}

impl Merkleizable for Transaction {
    fn append_leaves(&self, builder: &mut MerkleBuilder) {
        match self {
            Self::Legacy(tx) => {
                builder.add_field("to", tx.to.to().unwrap_or(&Address::ZERO).hash_custom());
                builder.add_field("nonce", tx.nonce.abi_encode().hash_custom());
                builder.add_field("value", tx.value.abi_encode().hash_custom());
                builder.add_field("gas_limit", tx.gas_limit.abi_encode().hash_custom());
                builder.add_field("max_fee_per_gas", tx.gas_price.abi_encode().hash_custom());
                builder.add_field(
                    "max_priority_fee_per_gas",
                    tx.gas_price.abi_encode().hash_custom(),
                );
                builder.add_field("call_data", tx.input.hash_custom());
            }
            Self::Eip1559(tx) => {
                builder.add_field("to", tx.to.to().unwrap_or(&Address::ZERO).hash_custom());
                builder.add_field("nonce", tx.nonce.abi_encode().hash_custom());
                builder.add_field("value", tx.value.abi_encode().hash_custom());
                builder.add_field("gas_limit", tx.gas_limit.abi_encode().hash_custom());
                builder.add_field(
                    "max_fee_per_gas",
                    tx.max_fee_per_gas.abi_encode().hash_custom(),
                );
                builder.add_field(
                    "max_priority_fee_per_gas",
                    tx.max_priority_fee_per_gas.abi_encode().hash_custom(),
                );
                builder.add_field("call_data", tx.input.hash_custom());
                // TODO: figure out how to handle access list
            }
        }
    }
}

/// Bincode-compatible serde adapter for [`Transaction`]. Mirrors alloy's
/// per-variant `serde_bincode_compat` helpers but limited to pod's two
/// supported variants — used by `Signed<Transaction>` so committee proofs and
/// detailed receipts round-trip cleanly through bincode.
pub mod serde_bincode_compat {
    use alloy_consensus::serde_bincode_compat as alloy_compat;
    use serde::{Deserialize, Deserializer, Serialize, Serializer};
    use serde_with::{DeserializeAs, SerializeAs};

    #[derive(Debug, Serialize, Deserialize)]
    pub enum Transaction<'a> {
        Legacy(alloy_compat::transaction::TxLegacy<'a>),
        Eip1559(alloy_compat::transaction::TxEip1559<'a>),
    }

    impl<'a> From<&'a super::Transaction> for Transaction<'a> {
        fn from(tx: &'a super::Transaction) -> Self {
            match tx {
                super::Transaction::Legacy(t) => Self::Legacy(t.into()),
                super::Transaction::Eip1559(t) => Self::Eip1559(t.into()),
            }
        }
    }

    impl<'a> From<Transaction<'a>> for super::Transaction {
        fn from(tx: Transaction<'a>) -> Self {
            match tx {
                Transaction::Legacy(t) => Self::Legacy(t.into()),
                Transaction::Eip1559(t) => Self::Eip1559(t.into()),
            }
        }
    }

    impl SerializeAs<super::Transaction> for Transaction<'_> {
        fn serialize_as<S>(source: &super::Transaction, serializer: S) -> Result<S::Ok, S::Error>
        where
            S: Serializer,
        {
            Transaction::<'_>::from(source).serialize(serializer)
        }
    }

    impl<'de> DeserializeAs<'de, super::Transaction> for Transaction<'de> {
        fn deserialize_as<D>(deserializer: D) -> Result<super::Transaction, D::Error>
        where
            D: Deserializer<'de>,
        {
            Transaction::<'_>::deserialize(deserializer).map(Into::into)
        }
    }
}
