use std::ops::Deref;

pub use alloy_primitives::{Log, LogData};
use alloy_rpc_types::Log as RPCLog;
use alloy_sol_types::SolValue;
use anyhow::Result;
use serde::{Deserialize, Serialize};

use crate::consensus::attestation::HeadlessAttestation;
use crate::cryptography::merkle_tree::MerkleBuilder;
use crate::cryptography::{hash::Hashable, Hash, MerkleMultiProof, Merkleizable};
use crate::metadata::{MetadataWrappedItem, PodLogMetadata};
use crate::storage::Indexed;
use crate::{Certificate, Committee, Timestamp};

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
    pub fn verify(&self, committee: &Committee) -> Result<bool> {
        committee.verify_certificate(&Certificate {
            signatures: self
                .pod_metadata
                .attestations
                .clone()
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
}

impl Deref for VerifiableLog {
    type Target = alloy_rpc_types::Log;

    fn deref(&self) -> &alloy_rpc_types::Log {
        &self.inner
    }
}
