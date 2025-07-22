use alloy_consensus::{Eip658Value, ReceiptWithBloom};
use alloy_primitives::{Address, Bloom, Log};
use alloy_rpc_types::TransactionReceipt;
use alloy_sol_types::SolValue;
use serde::{Deserialize, Serialize};

use super::log;
use crate::cryptography::{
    hash::{Hash, Hashable},
    merkle_tree::{MerkleBuilder, MerkleMultiProof, MerkleProof, Merkleizable, index_prefix},
};

#[derive(Clone, Serialize, Deserialize, Debug, Eq, PartialEq)]
#[cfg_attr(feature = "arbitrary", derive(arbitrary::Arbitrary))]
pub struct Receipt {
    pub status: bool,
    pub actual_gas_used: u64,
    pub max_fee_per_gas: u128,
    pub logs: Vec<Log>,
    pub logs_root: Hash,
    pub tx_hash: Hash,
    pub signer: Address,
    pub to: Option<Address>,
    pub contract_address: Option<Address>,
}

impl Receipt {
    fn log_hashes(&self) -> Vec<Hash> {
        self.logs.iter().map(|l| l.hash_custom()).collect()
    }

    // Generates a proof for the hash of the log at a given index.
    pub fn generate_proof_for_log_hash(&self, log_index: usize) -> Option<MerkleProof> {
        let log_hash = self.logs.get(log_index)?.hash_custom();

        self.generate_proof(&index_prefix("log_hashes", log_index), &log_hash)
    }

    // Generates a proof for the hash of each log at the given indices.
    pub fn generate_proofs_for_log_hashes(
        &self,
        log_indices: &[usize],
    ) -> Vec<Option<MerkleProof>> {
        log_indices
            .iter()
            .map(|&i| self.generate_proof_for_log_hash(i))
            .collect()
    }

    // Generates a multi proof for all log hashes in the receipt.
    pub fn generate_multi_proof_for_log_hashes(&self) -> (Vec<Hash>, MerkleMultiProof) {
        self.generate_multi_proof("log_hashes", &self.log_hashes())
            .expect("log_hashes should exist")
    }

    // Generates a multi proof for the children of the receipt log at the given index.
    pub fn generate_multi_proof_for_log(
        &self,
        log_index: usize,
    ) -> Option<(Vec<Hash>, MerkleMultiProof)> {
        self.generate_multi_proof(&index_prefix("logs", log_index), &self.logs[log_index])
    }

    // Generates a multi proof for all log children of all receipt logs.
    pub fn generate_multi_proof_for_logs(&self) -> (Vec<Hash>, MerkleMultiProof) {
        self.generate_multi_proofs("logs", &self.logs)
            .expect("logs should exist in the tree")
    }
}

impl Merkleizable for Receipt {
    fn append_leaves(&self, builder: &mut MerkleBuilder) {
        builder.add_field("status", self.status.abi_encode().hash_custom());
        builder.add_field(
            "actual_gas_used",
            self.actual_gas_used.abi_encode().hash_custom(),
        );
        builder.add_slice("logs", &self.logs);
        // NOTE: "log_hashes" isn't part of the Receipt struct
        builder.add_slice("log_hashes", &self.log_hashes());
        builder.add_field("logs_root", self.logs_root.abi_encode().hash_custom());
        builder.add_field("tx_hash", self.tx_hash);
    }
}

impl Hashable for Receipt {
    fn hash_custom(&self) -> Hash {
        self.to_merkle_tree().hash_custom()
    }
}

impl From<Receipt> for TransactionReceipt {
    fn from(val: Receipt) -> Self {
        TransactionReceipt {
            inner: alloy_consensus::ReceiptEnvelope::Eip1559(ReceiptWithBloom {
                logs_bloom: Bloom::from_iter(val.logs.iter()),
                receipt: alloy_consensus::Receipt {
                    status: Eip658Value::Eip658(val.status),
                    cumulative_gas_used: val.actual_gas_used, // Gas used in the block up until this tx.
                    logs: val
                        .logs
                        .into_iter()
                        .map(|l| log::to_rpc_format(l, val.tx_hash))
                        .collect(),
                },
            }),
            transaction_hash: val.tx_hash,
            transaction_index: Some(0),
            block_hash: Some(Hash::default()), // Need hash for tx confirmation on Metamask
            block_number: Some(1),             // Need number of tx confirmation on Metamask
            gas_used: val.actual_gas_used,     // Gas used by the transaction alone.
            effective_gas_price: val.max_fee_per_gas, // Use max_fee_per_gas for EIP-1559 transactions
            blob_gas_used: None,                      // This is none for non EIP-4844 transactions.
            blob_gas_price: None,                     // This is none for non EIP-4844 transactions.
            from: val.signer,
            to: val.to,
            contract_address: val.contract_address, // None if the transaction is not a contract creation.
        }
    }
}

#[cfg(test)]
mod test {
    use alloy_primitives::{Address, Log, LogData, TxKind, U256};
    use alloy_signer_local::PrivateKeySigner;

    use crate::{
        Hashable, Merkleizable, Transaction, TxSigner,
        cryptography::merkle_tree::StandardMerkleTree,
    };

    use super::Receipt;

    #[tokio::test]
    async fn test_provable_receipt() {
        let to: Address = "217f5658c6ecc27d439922263ad9bb8e992e0373".parse().unwrap();
        let transaction = Transaction {
            chain_id: 0x50d,
            to: TxKind::Call(to.clone()),
            nonce: 1337,
            gas_limit: 25_000,
            max_fee_per_gas: 20_000_000_000,
            max_priority_fee_per_gas: 1_000_000_000,
            value: U256::ZERO,
            access_list: Default::default(),
            input: Default::default(),
        };

        let log = Log {
            address: "217f5658c6ecc27d439922263ad9bb8e992e0373".parse().unwrap(),
            data: LogData::new_unchecked(
                vec![
                    "84bee513033536a8de8a8260e2674a4a3eebd61ddce74615fdeca8a1499f5efe"
                        .parse()
                        .unwrap(),
                    "18ed9725cd4e356a6aa0f7b9cc48d76f8c2219bacfccdb781df3fb3e71699a50"
                        .parse()
                        .unwrap(),
                ],
                vec![1].into(),
            ),
        };

        let signer = PrivateKeySigner::random();
        let tx = signer.sign_tx(transaction.clone()).unwrap();
        let logs = vec![log.clone()];
        let logs_tree = logs.to_merkle_tree();
        let logs_root = logs_tree.root();
        let receipt = Receipt {
            status: true,
            actual_gas_used: 23_112,
            max_fee_per_gas: transaction.max_fee_per_gas,
            logs: logs.clone(),
            logs_root,
            tx_hash: tx.hash_custom(),
            signer: tx.signer,
            to: Some(to),
            contract_address: None,
        };

        let receipt_tree = receipt.to_merkle_tree();
        let receipt_root = receipt_tree.hash_custom();

        let log_address_leaf =
            StandardMerkleTree::hash_leaf("logs[0].address".to_string(), log.address.hash_custom());
        let proof = receipt_tree.generate_proof(log_address_leaf).unwrap();
        assert!(StandardMerkleTree::verify_proof(
            receipt_root,
            log_address_leaf,
            proof
        ));

        let log_data_leaf = StandardMerkleTree::hash_leaf(
            "logs[0].data.data".to_string(),
            log.data.data.hash_custom(),
        );
        let mut leaves = vec![log_address_leaf, log_data_leaf];
        let proof = receipt_tree.generate_multi_proof(&leaves).unwrap();
        leaves.sort();
        assert!(StandardMerkleTree::verify_multi_proof(
            receipt_root,
            &leaves,
            proof
        ));

        let (leaves, proof) = receipt.generate_multi_proof_for_log(0).unwrap();
        assert!(StandardMerkleTree::verify_multi_proof(
            receipt_root,
            &leaves,
            proof
        ));

        let (leaves, proof) = receipt.generate_multi_proof_for_logs();
        assert!(StandardMerkleTree::verify_multi_proof(
            receipt_root,
            &leaves,
            proof
        ));
    }
}
