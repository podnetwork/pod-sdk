use std::collections::HashMap;

use multihash_codetable::MultihashDigest;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Operation {
    #[serde(rename = "type")]
    pub type_: OperationType,
    pub rotation_keys: Vec<String>,
    pub verification_methods: HashMap<String, String>,
    pub also_known_as: Vec<String>,
    pub services: HashMap<String, Service>,
    pub prev: Option<String>,
    pub sig: String,
}

#[derive(Copy, Clone, Debug, Serialize, Deserialize)]
pub enum OperationType {
    #[serde(rename = "plc_operation")]
    Operation,
    #[serde(rename = "plc_tombstone")]
    Tombstone,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Service {
    #[serde(rename = "type")]
    pub type_: String,
    pub endpoint: String,
}

impl Operation {
    pub fn cid(&self) -> anyhow::Result<String> {
        let dag = serde_ipld_dagcbor::to_vec(&self)?;
        let result = multihash_codetable::Code::Sha2_256.digest(dag.as_slice());
        let cid = cid::Cid::new_v1(0x71, result);
        Ok(cid.to_string())
    }
}
