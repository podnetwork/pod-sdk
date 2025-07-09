use std::ops::Deref;

pub use alloy_primitives::{Log, LogData};
use alloy_rpc_types::Log as RPCLog;
use alloy_sol_types::SolValue;
use serde::{Deserialize, Serialize};

use crate::{
    Certificate, Committee, Timestamp,
    consensus::{
        attestation::{HeadlessAttestation, Indexed},
        committee::CommitteeError,
    },
    cryptography::{
        Hash, MerkleMultiProof, Merkleizable,
        hash::Hashable,
        merkle_tree::{MerkleBuilder, MerkleProof, StandardMerkleTree, index_prefix},
    },
    metadata::{MetadataWrappedItem, PodLogMetadata},
};

use super::Receipt;

pub fn to_rpc_format(inner_log: Log, tx_hash: Hash) -> RPCLog {
    RPCLog {
        inner: inner_log,
        block_hash: Some(Hash::default()),
        block_number: Some(1),
        block_timestamp: None,
        transaction_hash: Some(tx_hash),
        transaction_index: Some(0),
        log_index: Some(0),
        removed: false,
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "arbitrary", derive(arbitrary::Arbitrary))]
pub struct Event {
    pub log: Log,
    pub log_index: u64,
    pub tx_hash: Hash,
    pub attestations: Vec<Indexed<HeadlessAttestation>>,
    pub receipt: Receipt,
}

// Implement Hashing for Ethereum LogData
// Hash is collected from forming a Merkle tree by adding hashes of N topics as leafs, and appending the hash of the data at the end
impl Merkleizable for LogData {
    fn append_leaves(&self, builder: &mut MerkleBuilder) {
        builder.add_slice("topics", self.topics());
        builder.add_field("data", self.data.hash_custom());
    }
}

impl Merkleizable for Log {
    fn append_leaves(&self, builder: &mut MerkleBuilder) {
        builder.add_field("address", self.address.hash_custom());
        builder.add_merkleizable("data", &self.data);
    }
}

impl Hashable for Log {
    fn hash_custom(&self) -> Hash {
        (self.address, self.data.topics(), &self.data.data)
            .abi_encode()
            .hash_custom()
    }
}

pub type VerifiableLog = MetadataWrappedItem<RPCLog, PodLogMetadata>;

impl VerifiableLog {
    // returns none if RPC did not provide `log_index` or if the provided `log_index` does not correspond to any log on the receipt
    // result can be proven with MerkleTree::verify_multi_proof(leaves, proof)
    pub fn generate_multi_proof(&self) -> Option<(Vec<Hash>, MerkleMultiProof)> {
        self.inner.log_index.and_then(|i| {
            self.pod_metadata
                .receipt
                .generate_multi_proof_for_log(i.try_into().unwrap())
        })
    }
    pub fn verify(&self, committee: &Committee) -> Result<(), CommitteeError> {
        committee.verify_certificate(&Certificate {
            signatures: self
                .pod_metadata
                .attestations
                .iter()
                .map(|att| att.signature)
                .collect(),
            certified: self.pod_metadata.receipt.clone(),
        })
    }
    pub fn confirmation_time(&self) -> Timestamp {
        let num_attestations = self.pod_metadata.attestations.len();
        self.pod_metadata.attestations[num_attestations / 2].timestamp
    }

    pub fn generate_proof(&self) -> Option<MerkleProof> {
        self.inner.log_index.and_then(|i| {
            self.pod_metadata
                .receipt
                .generate_proof_for_log_hash(i.try_into().unwrap())
        })
    }

    pub fn get_leaf(&self) -> Hash {
        let log_index = self.inner.log_index.unwrap_or(0).try_into().unwrap();
        StandardMerkleTree::hash_leaf(
            index_prefix("log_hashes", log_index),
            self.inner.inner.hash_custom(),
        )
    }

    pub fn aggregate_signatures(&self) -> Vec<u8> {
        self.pod_metadata
            .attestations
            .iter()
            .map(|a| a.signature.as_bytes())
            .fold(Vec::new(), |mut acc, sig| {
                acc.extend_from_slice(&sig);
                acc
            })
    }

    pub fn verify_proof(&self, receipt_root: Hash, proof: MerkleProof) -> bool {
        let leaf = self.get_leaf();
        StandardMerkleTree::verify_proof(receipt_root, leaf, proof)
    }
}

impl Deref for VerifiableLog {
    type Target = alloy_rpc_types::Log;

    fn deref(&self) -> &alloy_rpc_types::Log {
        &self.inner
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use alloy_primitives::{Log, LogData, TxKind, U256};
    use alloy_signer_local::PrivateKeySigner;

    use crate::{Hashable, Merkleizable, Transaction, TxSigner};

    #[tokio::test]
    async fn test_verifiable_log_hash_proof() {
        let log = Log {
            address: "0x217f5658c6ecc27d439922263ad9bb8e992e0373"
                .parse()
                .unwrap(),
            data: LogData::new_unchecked(
                vec![
                    "71a5674c44b823bc0df08201dfeb2e8bdf698cd684fd2bbaa79adcf2c99fc186"
                        .parse()
                        .unwrap(),
                    "0000000000000000000000000000000000000000000000000000000067dc55a9"
                        .parse()
                        .unwrap(),
                    "00000000000000000000000013791790bef192d14712d627f13a55c4abee52a4"
                        .parse()
                        .unwrap(),
                    "00000000000000000000000000000000000000000000000000000000cfb8ab4d"
                        .parse()
                        .unwrap(),
                ],
                "0000000000000000000000000000000000000000000000000de0b6b3a7640000"
                    .parse()
                    .unwrap(),
            ),
        };

        let transaction = Transaction {
            chain_id: 0x50d,
            to: TxKind::Call(
                "0x217f5658c6ecc27d439922263ad9bb8e992e0373"
                    .parse()
                    .unwrap(),
            ),
            nonce: 0,
            gas_limit: 22048,
            max_fee_per_gas: 1000000000,
            max_priority_fee_per_gas: 1000000000,
            access_list: Default::default(),
            value: U256::ZERO,
            input: vec![
                133, 44, 166, 18, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 103, 220, 85, 169, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 207, 184, 171, 77, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 13, 224, 182, 179, 167, 100, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 128, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0, 2, 18, 52, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            ]
            .into(),
        };
        let signer = PrivateKeySigner::random();

        let logs = vec![log.clone()];
        let logs_tree = logs.to_merkle_tree();
        let logs_root = logs_tree.root();

        let rpc_log = RPCLog {
            inner: log.clone(),
            block_hash: Some(Hash::default()),
            block_number: Some(0),
            block_timestamp: Some(1742493092),
            transaction_hash: Some(transaction.hash_custom()),
            transaction_index: Some(0),
            log_index: Some(0),
            removed: false,
        };

        let verifiable_log = VerifiableLog {
            inner: rpc_log,
            pod_metadata: PodLogMetadata {
                attestations: vec![],
                receipt: Receipt {
                    status: true,
                    actual_gas_used: 21784,
                    logs: logs.clone(),
                    logs_root,
                    tx: signer.sign_tx(transaction).unwrap(),
                    contract_address: None,
                },
            },
        };

        let proof = verifiable_log.generate_proof().unwrap();
        let receipt_root = verifiable_log
            .pod_metadata
            .receipt
            .to_merkle_tree()
            .hash_custom();

        assert!(verifiable_log.verify_proof(receipt_root, proof));
        assert_eq!(verifiable_log.inner.log_index, Some(0));
    }
}
