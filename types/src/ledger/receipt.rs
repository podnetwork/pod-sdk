use alloy_consensus::{
    Eip658Value, Receipt as ConsensusReceipt, ReceiptEnvelope, ReceiptWithBloom, TypedTransaction,
};
use alloy_primitives::{Address, Bloom, Log};
use alloy_rpc_types::TransactionReceipt;
use alloy_sol_types::SolValue;
use anyhow::{Result, bail};
use serde::{Deserialize, Serialize};

use crate::{
    cryptography::{
        hash::{Hash, Hashable},
        merkle_tree::{MerkleBuilder, MerkleMultiProof, MerkleProof, Merkleizable, index_prefix},
        signer::UncheckedSigned,
    },
    ledger::{log, transaction::TxEnvelope},
};

#[derive(Clone, Serialize, Deserialize, Debug, Eq, PartialEq)]
pub struct Receipt {
    pub status: bool,
    pub actual_gas_used: u64,
    pub logs: Vec<Log>,
    pub logs_root: Hash,
    pub tx: TxEnvelope,
    pub contract_address: Option<Address>,
    pub inner: ReceiptEnvelope<alloy_rpc_types::Log>,
}

impl Receipt {
    fn log_hashes(&self) -> Vec<Hash> {
        self.logs.iter().map(|l| l.hash_custom()).collect()
    }

    // Helper method to get gas price from transaction
    fn gas_price(&self) -> u128 {
        match &self.tx {
            TxEnvelope::Legacy(signed_tx) => signed_tx.tx().gas_price,
            TxEnvelope::Eip2930(signed_tx) => signed_tx.tx().gas_price,
            TxEnvelope::Eip1559(signed_tx) => signed_tx.tx().max_fee_per_gas,
            TxEnvelope::Eip4844(_) => 0, // Not supported yet
            TxEnvelope::Eip7702(_) => 0, // Not supported yet
        }
    }

    // Helper method to get to address from transaction
    fn to_address(&self) -> Option<Address> {
        match &self.tx {
            TxEnvelope::Legacy(signed_tx) => signed_tx.tx().to.to().copied(),
            TxEnvelope::Eip2930(signed_tx) => signed_tx.tx().to.to().copied(),
            TxEnvelope::Eip1559(signed_tx) => signed_tx.tx().to.to().copied(),
            TxEnvelope::Eip4844(_) => None, // Not supported yet
            TxEnvelope::Eip7702(_) => None, // Not supported yet
        }
    }

    // Generates a proof for the hash of the log at a given index.
    pub fn generate_proof_for_log_hash(&self, log_index: usize) -> Result<MerkleProof> {
        if log_index >= self.logs.len() {
            bail!("no log at index {}", log_index);
        }

        self.generate_proof(
            &index_prefix("log_hashes", log_index),
            &self.log_hashes()[log_index],
        )
    }

    // Generates a proof for the hash of each log at the given indices.
    pub fn generate_proofs_for_log_hashes(
        &self,
        log_indices: &[usize],
    ) -> Result<Vec<MerkleProof>> {
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

    // Helper method to create the appropriate ReceiptEnvelope based on transaction type
    fn create_receipt_envelope(&self) -> ReceiptEnvelope<alloy_rpc_types::Log> {
        let receipt_with_bloom = ReceiptWithBloom::<ConsensusReceipt<alloy_rpc_types::Log>> {
            logs_bloom: Bloom::from_iter(self.logs.iter()),
            receipt: ConsensusReceipt::<alloy_rpc_types::Log> {
                status: Eip658Value::Eip658(self.status),
                cumulative_gas_used: self.actual_gas_used,
                logs: self
                    .logs
                    .iter()
                    .map(|l| {
                        let rpc_log = log::to_rpc_format(l.clone(), self.tx.hash_custom());
                        rpc_log
                    })
                    .collect(),
            },
        };

        match &self.tx {
            TxEnvelope::Legacy(_) => ReceiptEnvelope::Legacy(receipt_with_bloom),
            TxEnvelope::Eip1559(_) => ReceiptEnvelope::Eip1559(receipt_with_bloom),
            TxEnvelope::Eip2930(_) => ReceiptEnvelope::Eip2930(receipt_with_bloom),
            TxEnvelope::Eip4844(_) => {
                panic!("EIP-4844 transactions not yet supported")
            }
            TxEnvelope::Eip7702(_) => {
                panic!("EIP-7702 transactions not yet supported")
            }
        }
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
        builder.add_merkleizable("tx", &self.tx);

        // TODO: figure out how to handle inner...
    }
}

impl Hashable for Receipt {
    fn hash_custom(&self) -> Hash {
        self.to_merkle_tree().hash_custom()
    }
}

impl From<Receipt> for TransactionReceipt {
    fn from(val: Receipt) -> Self {
        let gas_price = val.gas_price();
        let to_address = val.to_address();

        // Create the appropriate ReceiptEnvelope based on transaction type
        let receipt_envelope = val.create_receipt_envelope();

        TransactionReceipt {
            inner: receipt_envelope,
            transaction_hash: val.tx.hash_custom(),
            transaction_index: Some(0),
            block_hash: Some(Hash::default()), // Need hash for tx confirmation on Metamask
            block_number: Some(1),             // Need number of tx confirmation on Metamask
            gas_used: val.actual_gas_used,     // Gas used by the transaction alone.
            effective_gas_price: gas_price,
            blob_gas_used: None,  // This is none for non EIP-4844 transactions.
            blob_gas_price: None, // This is none for non EIP-4844 transactions.
            from: val.tx.recover_signer().unwrap(),
            to: to_address,
            contract_address: val.contract_address, // None if the transaction is not a contract creation.
        }
    }
}

#[derive(Clone, Serialize, Deserialize, Debug, Eq, PartialEq)]
pub struct UncheckedReceipt {
    pub status: bool,
    pub actual_gas_used: u64,
    pub logs: Vec<Log>,
    pub logs_root: Hash,
    pub tx: UncheckedSigned,
    pub contract_address: Option<Address>,
    pub inner: ReceiptEnvelope<alloy_rpc_types::Log>,
}

impl From<Receipt> for UncheckedReceipt {
    fn from(receipt: Receipt) -> Self {
        Self {
            status: receipt.status,
            actual_gas_used: receipt.actual_gas_used,
            logs: receipt.logs,
            logs_root: receipt.logs_root,
            tx: UncheckedSigned::from(receipt.tx),
            contract_address: receipt.contract_address,
            inner: receipt.inner,
        }
    }
}

impl UncheckedReceipt {
    fn log_hashes(&self) -> Vec<Hash> {
        self.logs.iter().map(|l| l.hash_custom()).collect()
    }

    /// Convert from an `UncheckedReceipt` to a fully fledged `Receipt`
    /// _without_ re-verifying.
    pub fn into_unchecked(self) -> Receipt {
        Receipt {
            status: self.status,
            actual_gas_used: self.actual_gas_used,
            logs: self.logs,
            logs_root: self.logs_root,
            tx: self.tx.into_envelope(),
            contract_address: self.contract_address,
            inner: self.inner,
        }
    }

    // Helper method to create the appropriate ReceiptEnvelope based on transaction type
    pub fn create_receipt_envelope(&self) -> ReceiptEnvelope<alloy_rpc_types::Log> {
        let receipt_with_bloom = ReceiptWithBloom::<ConsensusReceipt<alloy_rpc_types::Log>> {
            logs_bloom: Bloom::from_iter(self.logs.iter()),
            receipt: ConsensusReceipt::<alloy_rpc_types::Log> {
                status: Eip658Value::Eip658(self.status),
                cumulative_gas_used: self.actual_gas_used,
                logs: self
                    .logs
                    .iter()
                    .map(|l| {
                        let rpc_log = log::to_rpc_format(l.clone(), self.tx.hash_custom());
                        rpc_log
                    })
                    .collect(),
            },
        };

        match &self.tx.tx {
            TypedTransaction::Legacy(_) => ReceiptEnvelope::Legacy(receipt_with_bloom),
            TypedTransaction::Eip1559(_) => ReceiptEnvelope::Eip1559(receipt_with_bloom),
            TypedTransaction::Eip2930(_) => ReceiptEnvelope::Eip2930(receipt_with_bloom),
            TypedTransaction::Eip4844(_) => {
                panic!("EIP-4844 transactions not yet supported")
            }
            TypedTransaction::Eip7702(_) => {
                panic!("EIP-7702 transactions not yet supported")
            }
        }
    }
}

impl Merkleizable for UncheckedReceipt {
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
        builder.add_merkleizable("tx", &self.tx);

        // TODO: figure out how to handle inner...
    }
}

impl Hashable for UncheckedReceipt {
    fn hash_custom(&self) -> Hash {
        self.to_merkle_tree().hash_custom()
    }
}

#[cfg(test)]
mod test {
    use alloy_consensus::{
        Eip658Value, Receipt as ConsensusReceipt, ReceiptEnvelope, ReceiptWithBloom, TxEip1559,
        TxEip2930, TxLegacy,
    };
    use alloy_primitives::{Bloom, Log, LogData, TxKind, U256};
    use alloy_rpc_types::TransactionReceipt;
    use alloy_signer_local::PrivateKeySigner;

    use crate::cryptography::hash::Hash;
    use crate::{Hashable, Merkleizable, cryptography::merkle_tree::StandardMerkleTree};

    use super::Receipt;

    #[tokio::test]
    async fn test_provable_receipt() {
        let tx_legacy = TxLegacy {
            chain_id: Some(0x50d),
            to: TxKind::Call("217f5658c6ecc27d439922263ad9bb8e992e0373".parse().unwrap()),
            nonce: 1337,
            gas_limit: 25_000,
            gas_price: 20_000_000_000,
            value: U256::ZERO,
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

        let logs = vec![log.clone()];
        let logs_tree = logs.to_merkle_tree();
        let logs_root = logs_tree.root();
        let signer = PrivateKeySigner::random();

        let signed_tx = crate::Signer::sign_tx(&signer, &tx_legacy).await.unwrap();

        // Create a temporary receipt to get the receipt_envelope
        let temp_receipt = Receipt {
            status: true,
            actual_gas_used: 23_112,
            logs: logs.clone(),
            logs_root,
            tx: signed_tx.clone(),
            contract_address: None,
            inner: ReceiptEnvelope::Legacy(ReceiptWithBloom::<
                ConsensusReceipt<alloy_rpc_types::Log>,
            > {
                logs_bloom: Bloom::from_iter(logs.iter()),
                receipt: ConsensusReceipt::<alloy_rpc_types::Log> {
                    status: Eip658Value::Eip658(true),
                    cumulative_gas_used: 23_112,
                    logs: vec![],
                },
            }),
        };

        let receipt = Receipt {
            status: true,
            actual_gas_used: 23_112,
            logs: logs.clone(),
            logs_root,
            tx: signed_tx,
            contract_address: None,
            inner: temp_receipt.create_receipt_envelope(),
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
        assert!(StandardMerkleTree::verify_multi_proof(receipt_root, &leaves, proof).unwrap());

        let (leaves, proof) = receipt.generate_multi_proof_for_log(0).unwrap();
        assert!(StandardMerkleTree::verify_multi_proof(receipt_root, &leaves, proof).unwrap());

        let (leaves, proof) = receipt.generate_multi_proof_for_logs();
        assert!(StandardMerkleTree::verify_multi_proof(receipt_root, &leaves, proof).unwrap());
    }

    #[tokio::test]
    async fn test_eip2930_receipt() {
        let tx_eip2930 = TxEip2930 {
            chain_id: 0x50d,
            to: TxKind::Call("217f5658c6ecc27d439922263ad9bb8e992e0373".parse().unwrap()),
            nonce: 1337,
            gas_limit: 25_000,
            gas_price: 20_000_000_000,
            value: U256::ZERO,
            input: Default::default(),
            access_list: vec![].into(), // Empty access list for simplicity
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
                vec![2, 3, 4].into(),
            ),
        };

        let logs = vec![log.clone()];
        let logs_tree = logs.to_merkle_tree();
        let logs_root = logs_tree.root();
        let signer = PrivateKeySigner::random();

        let signed_tx = crate::Signer::sign_tx(&signer, &tx_eip2930).await.unwrap();

        // Create a temporary receipt to get the receipt_envelope
        let temp_receipt = Receipt {
            status: true,
            actual_gas_used: 24_500,
            logs: logs.clone(),
            logs_root,
            tx: signed_tx.clone(),
            contract_address: None,
            inner: ReceiptEnvelope::Eip2930(ReceiptWithBloom::<
                ConsensusReceipt<alloy_rpc_types::Log>,
            > {
                logs_bloom: Bloom::from_iter(logs.iter()),
                receipt: ConsensusReceipt::<alloy_rpc_types::Log> {
                    status: Eip658Value::Eip658(true),
                    cumulative_gas_used: 24_500,
                    logs: vec![],
                },
            }),
        };

        let receipt = Receipt {
            status: true,
            actual_gas_used: 24_500,
            logs: logs.clone(),
            logs_root,
            tx: signed_tx,
            contract_address: None,
            inner: temp_receipt.create_receipt_envelope(),
        };

        // Test that the receipt envelope is correctly set to EIP-2930
        match receipt.inner {
            ReceiptEnvelope::Eip2930(_) => {
                // This is correct
            }
            _ => panic!("Expected EIP-2930 receipt envelope"),
        }

        // Test merkle tree functionality
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

        // Test gas price extraction
        assert_eq!(receipt.gas_price(), 20_000_000_000);
    }

    #[tokio::test]
    async fn test_eip1559_receipt() {
        let tx_eip1559 = TxEip1559 {
            chain_id: 0x50d,
            to: TxKind::Call("217f5658c6ecc27d439922263ad9bb8e992e0373".parse().unwrap()),
            nonce: 1337,
            gas_limit: 25_000,
            max_fee_per_gas: 30_000_000_000,
            max_priority_fee_per_gas: 2_000_000_000,
            value: U256::ZERO,
            input: Default::default(),
            access_list: vec![].into(), // Empty access list for simplicity
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
                    "aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899"
                        .parse()
                        .unwrap(),
                ],
                vec![5, 6, 7, 8].into(),
            ),
        };

        let logs = vec![log.clone()];
        let logs_tree = logs.to_merkle_tree();
        let logs_root = logs_tree.root();
        let signer = PrivateKeySigner::random();

        let signed_tx = crate::Signer::sign_tx(&signer, &tx_eip1559).await.unwrap();

        // Create a temporary receipt to get the receipt_envelope
        let temp_receipt = Receipt {
            status: true,
            actual_gas_used: 26_000,
            logs: logs.clone(),
            logs_root,
            tx: signed_tx.clone(),
            contract_address: None,
            inner: ReceiptEnvelope::Eip1559(ReceiptWithBloom::<
                ConsensusReceipt<alloy_rpc_types::Log>,
            > {
                logs_bloom: Bloom::from_iter(logs.iter()),
                receipt: ConsensusReceipt::<alloy_rpc_types::Log> {
                    status: Eip658Value::Eip658(true),
                    cumulative_gas_used: 26_000,
                    logs: vec![],
                },
            }),
        };

        let receipt = Receipt {
            status: true,
            actual_gas_used: 26_000,
            logs: logs.clone(),
            logs_root,
            tx: signed_tx,
            contract_address: None,
            inner: temp_receipt.create_receipt_envelope(),
        };

        // Test that the receipt envelope is correctly set to EIP-1559
        match receipt.inner {
            ReceiptEnvelope::Eip1559(_) => {
                // This is correct
            }
            _ => panic!("Expected EIP-1559 receipt envelope"),
        }

        // Test merkle tree functionality
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

        // Test gas price extraction (should return max_fee_per_gas for EIP-1559)
        assert_eq!(receipt.gas_price(), 30_000_000_000);

        // Test multi-proof functionality
        let (leaves, proof) = receipt.generate_multi_proof_for_log(0).unwrap();
        assert!(StandardMerkleTree::verify_multi_proof(receipt_root, &leaves, proof).unwrap());
    }

    #[tokio::test]
    async fn test_receipt_envelope_conversion() {
        // Test that From<Receipt> for TransactionReceipt works for all transaction types
        let signer = PrivateKeySigner::random();

        // Test Legacy transaction
        let tx_legacy = TxLegacy {
            chain_id: Some(0x50d),
            to: TxKind::Call("217f5658c6ecc27d439922263ad9bb8e992e0373".parse().unwrap()),
            nonce: 1,
            gas_limit: 21_000,
            gas_price: 20_000_000_000,
            value: U256::ZERO,
            input: Default::default(),
        };

        let signed_tx = crate::Signer::sign_tx(&signer, &tx_legacy).await.unwrap();

        let receipt = Receipt {
            status: true,
            actual_gas_used: 21_000,
            logs: vec![],
            logs_root: Hash::default(),
            tx: signed_tx,
            contract_address: None,
            inner: ReceiptEnvelope::Legacy(ReceiptWithBloom::<
                ConsensusReceipt<alloy_rpc_types::Log>,
            > {
                logs_bloom: Bloom::default(),
                receipt: ConsensusReceipt::<alloy_rpc_types::Log> {
                    status: Eip658Value::Eip658(true),
                    cumulative_gas_used: 21_000,
                    logs: vec![],
                },
            }),
        };

        let transaction_receipt: TransactionReceipt = receipt.into();
        assert_eq!(transaction_receipt.gas_used, 21_000);
        assert_eq!(transaction_receipt.effective_gas_price, 20_000_000_000);
    }
}
