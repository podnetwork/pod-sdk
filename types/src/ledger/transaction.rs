use alloy_consensus::{SignableTransaction, TxEip1559};
use alloy_primitives::Address;
use alloy_sol_types::SolValue;

use crate::cryptography::{
    hash::{Hash, Hashable},
    merkle_tree::{MerkleBuilder, Merkleizable},
};

pub type Transaction = TxEip1559;

impl Merkleizable for Transaction {
    fn append_leaves(&self, builder: &mut MerkleBuilder) {
        builder.add_field("to", self.to.to().unwrap_or(&Address::ZERO).hash_custom());
        builder.add_field("nonce", self.nonce.abi_encode().hash_custom());
        builder.add_field("value", self.value.abi_encode().hash_custom());
        builder.add_field("gas_limit", self.gas_limit.abi_encode().hash_custom());
        builder.add_field(
            "max_fee_per_gas",
            self.max_fee_per_gas.abi_encode().hash_custom(),
        );
        builder.add_field(
            "max_priority_fee_per_gas",
            self.max_priority_fee_per_gas.abi_encode().hash_custom(),
        );
        builder.add_field("call_data", self.input.hash_custom());
        // TODO: figure out how to handle access list
    }
}

impl Hashable for Transaction {
    fn hash_custom(&self) -> Hash {
        self.signature_hash()
    }
}
