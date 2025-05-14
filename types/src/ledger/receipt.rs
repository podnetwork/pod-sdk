use alloy_consensus::{Eip658Value, ReceiptWithBloom};
use alloy_primitives::{Address, Bloom, Log};
use alloy_rpc_types::TransactionReceipt;
use alloy_sol_types::SolValue;
use anyhow::{bail, Result};
use serde::{Deserialize, Serialize};
use std::convert::TryInto;

use super::{log, Transaction};
use crate::cryptography::hash::{DomainDigest, MessageDigest};
use crate::cryptography::{
    hash::{Hash, Hashable},
    merkle_tree::{index_prefix, MerkleBuilder, MerkleMultiProof, MerkleProof, Merkleizable},
    signer::{Signed, UncheckedSigned},
};
use crate::sig_hash::{
    SigHashable, SIG_PREFIX_RECEIPT_ATTESTATION, SIG_PREFIX_TX_ATTESTATION,
    SIG_VERSION_RECEIPT_ATTESTATION, SIG_VERSION_TX_ATTESTATION,
};

#[derive(Clone, Serialize, Deserialize, Debug, Eq, PartialEq)]
pub struct Receipt {
    pub status: bool,
    pub actual_gas_used: u64,
    pub logs: Vec<Log>,
    pub logs_root: Hash,
    pub tx: Signed<Transaction>,
    pub contract_address: Option<Address>,
}

impl Receipt {
    fn log_hashes(&self) -> Vec<Hash> {
        self.logs.iter().map(|l| l.hash_custom()).collect()
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
    }
}

impl Hashable for Receipt {
    fn hash_custom(&self) -> Hash {
        self.to_merkle_tree().hash_custom()
    }
}

impl SigHashable for Receipt {
    fn hash_for_signature(&self) -> Hash {
        let digest = MessageDigest {
            domain: DomainDigest {
                prefix: SIG_PREFIX_RECEIPT_ATTESTATION,
                version: SIG_VERSION_RECEIPT_ATTESTATION,
            },
            message: self.hash_custom(),
        };
        digest.hash_custom()
    }
}

impl TryInto<TransactionReceipt> for Receipt {
    type Error = anyhow::Error;

    fn try_into(self) -> Result<TransactionReceipt> {
        Ok(TransactionReceipt {
            inner: alloy_consensus::ReceiptEnvelope::Legacy(ReceiptWithBloom {
                receipt: alloy_consensus::Receipt {
                    status: Eip658Value::Eip658(self.status),
                    cumulative_gas_used: self.actual_gas_used, // Gas used in the block up until this tx.
                    logs: self
                        .logs
                        .iter()
                        .map(|l| log::to_rpc_format(l.clone(), self.tx.hash_custom()))
                        .collect(),
                },
                logs_bloom: Bloom::from_iter(self.logs.iter()),
            }),
            transaction_hash: self.tx.hash_custom(),
            transaction_index: Some(0),
            block_hash: Some(Hash::default()), // Need hash for tx confirmation on Metamask
            block_number: Some(1),             // Need number of tx confirmation on Metamask
            gas_used: self.actual_gas_used,    // Gas used by the transaction alone.
            effective_gas_price: self.tx.gas_price,
            blob_gas_used: None,  // This is none for non EIP-4844 transactions.
            blob_gas_price: None, // This is none for non EIP-4844 transactions.
            from: self.tx.signer,
            to: self.tx.signed.to.to().cloned(),
            contract_address: self.contract_address, // None if the transaction is not a contract creation.
            authorization_list: None,
        })
    }
}

#[derive(Clone, Serialize, Deserialize, Debug, Eq, PartialEq)]
pub struct UncheckedReceipt {
    pub status: bool,
    pub actual_gas_used: u64,
    pub logs: Vec<Log>,
    pub logs_root: Hash,
    pub tx: UncheckedSigned<Transaction>,
    pub contract_address: Option<Address>,
}

impl From<Receipt> for UncheckedReceipt {
    fn from(receipt: Receipt) -> Self {
        Self {
            status: receipt.status,
            actual_gas_used: receipt.actual_gas_used,
            logs: receipt.logs,
            logs_root: receipt.logs_root,
            tx: receipt.tx.into(),
            contract_address: receipt.contract_address,
        }
    }
}

impl UncheckedReceipt {
    /// Convert from an `UncheckedReceipt` to a fully fledged `Receipt`
    /// _without_ re-verifying.
    pub fn into_unchecked(self) -> Receipt {
        Receipt {
            status: self.status,
            actual_gas_used: self.actual_gas_used,
            logs: self.logs,
            logs_root: self.logs_root,
            tx: self.tx.into_signed_unchecked(),
            contract_address: self.contract_address,
        }
    }
}

impl UncheckedReceipt {
    fn log_hashes(&self) -> Vec<Hash> {
        self.logs.iter().map(|l| l.hash_custom()).collect()
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
    }
}

impl Hashable for UncheckedReceipt {
    fn hash_custom(&self) -> Hash {
        self.to_merkle_tree().hash_custom()
    }
}

impl SigHashable for UncheckedReceipt {
    fn hash_for_signature(&self) -> Hash {
        Hash::default()
    }
}

#[cfg(test)]
mod test {
    use alloy_primitives::{Log, LogData, TxKind, U256};
    use alloy_signer_local::PrivateKeySigner;

    use crate::{
        cryptography::merkle_tree::StandardMerkleTree, Hashable, Merkleizable, Transaction,
    };

    use super::Receipt;

    #[tokio::test]
    async fn test_provable_receipt() {
        let transaction = Transaction {
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
        let receipt = Receipt {
            status: true,
            actual_gas_used: 23_112,
            logs: logs.clone(),
            logs_root,
            tx: crate::Signer::sign_tx(&signer, &transaction).await.unwrap(),
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
        assert!(StandardMerkleTree::verify_multi_proof(receipt_root, &leaves, proof).unwrap());

        let (leaves, proof) = receipt.generate_multi_proof_for_log(0).unwrap();
        assert!(StandardMerkleTree::verify_multi_proof(receipt_root, &leaves, proof).unwrap());

        let (leaves, proof) = receipt.generate_multi_proof_for_logs();
        assert!(StandardMerkleTree::verify_multi_proof(receipt_root, &leaves, proof).unwrap());
    }
}
