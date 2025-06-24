use alloy_primitives::{Address, TxKind};
use alloy_sol_types::SolValue;

use crate::cryptography::{
    hash::{Hash, Hashable},
    merkle_tree::{MerkleBuilder, Merkleizable},
};

// Re-export TxEnvelope for convenience
pub use alloy_consensus::TxEnvelope;

impl Merkleizable for TxEnvelope {
    fn append_leaves(&self, builder: &mut MerkleBuilder) {
        match self {
            TxEnvelope::Legacy(signed_tx) => {
                let tx = signed_tx.tx();
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
            TxEnvelope::Eip2930(signed_tx) => {
                let tx = signed_tx.tx();
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
            TxEnvelope::Eip1559(signed_tx) => {
                let tx = signed_tx.tx();
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
            TxEnvelope::Eip4844(_signed_tx) => {
                panic!("EIP-4844 transactions not yet supported")
            }
            TxEnvelope::Eip7702(_signed_tx) => {
                panic!("EIP-7702 transactions not yet supported")
            }
        }
    }
}

impl Hashable for TxEnvelope {
    fn hash_custom(&self) -> Hash {
        self.signature_hash()
    }
}
