use std::{collections::HashMap, sync::OnceLock};

use crate::{consensus::attestation::TimestampedHeadlessAttestation, Receipt, Signed, Transaction};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MetadataWrappedItem<T, M> {
    #[serde(flatten)]
    pub inner: T,
    pub pod_metadata: M,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DetailedReceiptMetadata {
    pub attestations: Vec<TimestampedHeadlessAttestation>,
    pub transaction: Signed<Transaction>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RegularReceiptMetadata {
    pub attestations: Vec<TimestampedHeadlessAttestation>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TransactionMetadata {
    pub attestations: Vec<TimestampedHeadlessAttestation>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PodLogMetadata {
    pub attestations: Vec<TimestampedHeadlessAttestation>,
    pub receipt: Receipt,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PrecompileMetadata {
    pub chain_id_to_rpc_url: HashMap<u64, String>,
}

impl PrecompileMetadata {
    pub fn new() -> Self {
        Self {
            chain_id_to_rpc_url: HashMap::new(),
        }
    }

    pub fn add_chain(&mut self, chain_id: u64, rpc_url: String) {
        self.chain_id_to_rpc_url.insert(chain_id, rpc_url);
    }

    pub fn get_rpc_url(&self, chain_id: u64) -> Option<&String> {
        self.chain_id_to_rpc_url.get(&chain_id)
    }
}

impl Default for PrecompileMetadata {
    fn default() -> Self {
        Self::new()
    }
}

pub static PRECOMPILE_METADATA_SINGLETON: OnceLock<PrecompileMetadata> = OnceLock::new();
