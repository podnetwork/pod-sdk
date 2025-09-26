use alloy_consensus::{SignableTransaction, TxEip1559};
use alloy_primitives::{Address, U256};
use alloy_sol_types::SolValue;

use crate::cryptography::{
    hash::{Hash, Hashable},
    merkle_tree::{MerkleBuilder, Merkleizable},
};

pub type Transaction = TxEip1559;

pub trait PodTransactionExt {
    /// TX gas cost (max_fee_per_gas * gas_limit)
    fn cost_from_gas(&self) -> Option<u128>;

    /// Total cost of the transaction (gas cost + value)
    fn total_cost(&self) -> Option<U256>;
}

impl PodTransactionExt for Transaction {
    fn cost_from_gas(&self) -> Option<u128> {
        self.max_fee_per_gas.checked_mul(self.gas_limit as u128)
    }

    fn total_cost(&self) -> Option<U256> {
        self.cost_from_gas()
            .and_then(|cost| U256::from(cost).checked_add(self.value))
    }
}

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
