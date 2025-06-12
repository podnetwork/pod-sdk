use std::{collections::HashMap, ops::Deref, string::FromUtf8Error};

use anyhow::anyhow;
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
}

#[derive(Clone, Debug, Deserialize)]
pub struct SignedOperation {
    #[serde(flatten)]
    pub op: Operation,
    pub sig: String,
}

impl Deref for SignedOperation {
    type Target = Operation;

    fn deref(&self) -> &Self::Target {
        &self.op
    }
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

impl From<Operation> for crate::bindings::Op {
    fn from(value: Operation) -> Self {
        Self {
            type_: match value.type_ {
                OperationType::Operation => crate::bindings::OperationType::Operation,
                OperationType::Tombstone => crate::bindings::OperationType::Tombstone,
            },
            rotationKeys: value
                .rotation_keys
                .into_iter()
                .map(|s| s.into_bytes().into())
                .collect(),
            verificationMethods: value
                .verification_methods
                .into_iter()
                .map(|(k, v)| crate::bindings::VerificationMethod {
                    name: k.into_bytes().into(),
                    key: v.into_bytes().into(),
                })
                .collect(),
            alsoKnownAs: value
                .also_known_as
                .into_iter()
                .map(|s| s.into_bytes().into())
                .collect(),
            services: value
                .services
                .into_iter()
                .map(|(k, v)| crate::bindings::Service {
                    name: k.into_bytes().into(),
                    type_: v.type_.into_bytes().into(),
                    endpoint: v.endpoint.into_bytes().into(),
                })
                .collect(),
            prev: value
                .prev
                .map(|s| s.into_bytes().into())
                .unwrap_or_default(),
        }
    }
}

impl TryFrom<crate::bindings::Op> for Operation {
    type Error = anyhow::Error;

    fn try_from(value: crate::bindings::Op) -> Result<Self, Self::Error> {
        Ok(Self {
            type_: match value.type_ {
                crate::bindings::OperationType::Operation => OperationType::Operation,
                crate::bindings::OperationType::Tombstone => OperationType::Tombstone,
                _ => {
                    return Err(anyhow!(
                        "Op returned from contract should already be checked"
                    ));
                }
            },
            rotation_keys: value
                .rotationKeys
                .into_iter()
                .map(|b| String::from_utf8(b.to_vec()))
                .collect::<Result<_, _>>()?,
            verification_methods: value
                .verificationMethods
                .into_iter()
                .map(|m| -> Result<_, FromUtf8Error> {
                    Ok((
                        String::from_utf8(m.name.to_vec())?,
                        String::from_utf8(m.key.to_vec())?,
                    ))
                })
                .collect::<Result<_, _>>()?,
            also_known_as: value
                .alsoKnownAs
                .into_iter()
                .map(|a| String::from_utf8(a.to_vec()))
                .collect::<Result<_, _>>()?,
            services: value
                .services
                .into_iter()
                .map(|s| -> Result<_, FromUtf8Error> {
                    Ok((
                        String::from_utf8(s.name.to_vec())?,
                        Service {
                            type_: String::from_utf8(s.type_.to_vec())?,
                            endpoint: String::from_utf8(s.endpoint.to_vec())?,
                        },
                    ))
                })
                .collect::<Result<_, _>>()?,
            prev: if value.prev.is_empty() {
                None
            } else {
                Some(String::from_utf8(value.prev.to_vec())?)
            },
        })
    }
}
