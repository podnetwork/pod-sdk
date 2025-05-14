use alloy_consensus::{transaction::RlpEcdsaTx, SignableTransaction, TxLegacy};
use alloy_primitives::Address;
use alloy_sol_types::SolValue;

use crate::cryptography::hash::{DomainDigest, MessageDigest};
use crate::cryptography::{
    hash::{Hash, Hashable},
    merkle_tree::{MerkleBuilder, Merkleizable},
    signer::{Signed, UncheckedSigned},
    SigHashable,
};
use crate::sig_hash::{SIG_PREFIX_TX_ATTESTATION, SIG_VERSION_TX_ATTESTATION};

pub type Transaction = TxLegacy;

impl Merkleizable for Transaction {
    fn append_leaves(&self, builder: &mut MerkleBuilder) {
        builder.add_field("to", self.to.to().unwrap_or(&Address::ZERO).hash_custom());
        builder.add_field("nonce", self.nonce.abi_encode().hash_custom());
        builder.add_field("value", self.value.abi_encode().hash_custom());
        builder.add_field("gas_limit", self.gas_limit.abi_encode().hash_custom());
        builder.add_field("gas_price", self.gas_price.abi_encode().hash_custom());
        builder.add_field("call_data", self.input.hash_custom());
    }
}

impl Hashable for Transaction {
    fn hash_custom(&self) -> Hash {
        self.signature_hash()
    }
}

// the actual hash used for identifying a transaction
impl Hashable for Signed<Transaction> {
    fn hash_custom(&self) -> Hash {
        self.signed.tx_hash(&self.signature)
    }
}

impl SigHashable for Signed<Transaction> {
    fn hash_for_signature(&self) -> Hash {
        let digest = MessageDigest {
            domain: DomainDigest {
                prefix: SIG_PREFIX_TX_ATTESTATION,
                version: SIG_VERSION_TX_ATTESTATION,
            },
            message: self.hash_custom(),
        };
        digest.hash_custom()
    }
}

impl<T: Hashable + Clone> Hashable for UncheckedSigned<T> {
    fn hash_custom(&self) -> Hash {
        self.signed.hash_custom()
    }
}

impl<T: Hashable + Clone> SigHashable for UncheckedSigned<T> {
    fn hash_for_signature(&self) -> Hash {
        Hash::default()
    }
}
