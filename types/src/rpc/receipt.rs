use crate::Timestamp;
use alloy_network::ReceiptResponse;
use alloy_primitives::{Address, B256, BlockHash, TxHash};
use alloy_rpc_types::TransactionReceipt;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PodAttestation {
    pub validator_address: Address,
    pub sequence: u64,
    pub index: u16,
    pub timestamp: Timestamp,
    pub signature: secp256k1::ecdsa::Signature,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PodMetadata {
    pub attestations: Vec<PodAttestation>,
    pub committee_epoch: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PodReceiptResponse {
    #[serde(flatten)]
    pub receipt: TransactionReceipt,
    pub pod_metadata: PodMetadata,
}

impl std::ops::Deref for PodReceiptResponse {
    type Target = TransactionReceipt;
    fn deref(&self) -> &TransactionReceipt {
        &self.receipt
    }
}

impl ReceiptResponse for PodReceiptResponse {
    fn contract_address(&self) -> Option<Address> {
        // For now not allowing deployments
        None
    }

    fn status(&self) -> bool {
        self.receipt.status()
    }

    fn block_hash(&self) -> Option<BlockHash> {
        // todo
        Some(BlockHash::default())
    }

    fn block_number(&self) -> Option<u64> {
        // todo
        None
    }

    fn transaction_hash(&self) -> TxHash {
        self.receipt.transaction_hash()
    }

    fn transaction_index(&self) -> Option<u64> {
        // todo
        None
    }

    fn gas_used(&self) -> u64 {
        self.receipt.gas_used()
    }

    fn effective_gas_price(&self) -> u128 {
        self.receipt.effective_gas_price()
    }

    fn blob_gas_used(&self) -> Option<u64> {
        // todo
        None
    }

    fn blob_gas_price(&self) -> Option<u128> {
        // todo
        None
    }

    fn from(&self) -> Address {
        self.receipt.from()
    }

    fn to(&self) -> Option<Address> {
        self.receipt.to()
    }

    fn cumulative_gas_used(&self) -> u64 {
        // todo
        self.receipt.cumulative_gas_used()
    }

    fn state_root(&self) -> Option<B256> {
        // todo
        None
    }
}
