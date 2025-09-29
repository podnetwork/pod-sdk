use crate::{Hash, Hashable, Timestamp};
use alloy_primitives::Address;
use alloy_sol_types::SolStruct;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

mod sol {
    alloy_sol_types::sol! {
        struct ContractSeq {
            address addr;
            uint64  seq;
        }

        struct AttestationMetadata712 {
            uint128 timestamp_micros;
            uint64  global_sequence;
            ContractSeq[] contract_sequences;
        }
    }
}

use sol::{AttestationMetadata712, ContractSeq};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[cfg_attr(any(test, feature = "arbitrary"), derive(arbitrary::Arbitrary))]
pub struct AttestationMetadata {
    pub timestamp: Timestamp,
    pub global_sequence: u64,
    pub contract_sequences: BTreeMap<Address, u64>,
}

impl Hashable for AttestationMetadata {
    fn hash_custom(&self) -> Hash {
        let seqs: Vec<ContractSeq> = self
            .contract_sequences
            .iter()
            .map(|(addr, seq)| ContractSeq {
                addr: *addr,
                seq: *seq,
            })
            .collect();

        let typed = AttestationMetadata712 {
            timestamp_micros: self.timestamp.as_micros(),
            global_sequence: self.global_sequence,
            contract_sequences: seqs,
        };

        typed.eip712_signing_hash(&alloy_sol_types::eip712_domain! {
            name: "attestation_metadata",
            version: "1",
            chain_id: 0x50d,
        })
    }
}
