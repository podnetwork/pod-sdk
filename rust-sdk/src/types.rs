pub use alloy_consensus::TxLegacy;
pub use alloy_primitives::U256;

pub use alloy_primitives::{Address, Bytes, TxKind, B256 as Hash};

pub use pod_types::{
    consensus::attestation::HeadlessAttestation, cryptography::ecdsa::SignatureECDSA, Certificate,
    Receipt,
};

/// Hypothetical Chain IDs supported by POD
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u64)]
pub enum ChainId {
    Devnet = 1337,
    Testnet = 1338,
    Mainnet = 1339,
    Custom(u64),
}

impl From<ChainId> for u64 {
    fn from(chain_id: ChainId) -> Self {
        match chain_id {
            ChainId::Custom(id) => id,
            chain_id => u64::from(chain_id),
        }
    }
}

#[derive(Debug)]
pub struct TransactionReceipt {
    pub certificate: Certificate<Receipt>,
    pub attestations: Vec<HeadlessAttestation>,
}

#[derive(Debug, Clone, Default)]
pub struct EventFilter {
    pub address: Address,
    pub topics: [Hash; 4],
    pub from_timestamp: Option<u64>,
    pub to_timestamp: Option<u64>,
    pub min_attestations: usize,
}

#[derive(Debug)]
pub struct VerifiedLog {
    pub event: alloy_rpc_types::Log,
    pub proof: EventProof,
}

#[derive(Debug)]
pub struct EventProof {
    pub receipt_hash: Hash,
    pub merkle_proof: Vec<Hash>,
    pub signatures: Vec<SignatureECDSA>,
}

pub struct LegacyTransactionBuilder {
    chain_id: ChainId,
    nonce: u64,
    gas_price: U256,
    gas_limit: U256,
    to: Address,
    value: U256,
    data: Bytes,
}

impl LegacyTransactionBuilder {
    pub fn new(to: Address) -> Self {
        Self {
            chain_id: ChainId::Devnet,
            nonce: 0,
            gas_price: U256::from(20_000_000_000u64),
            gas_limit: U256::from(21_000u64),
            to,
            value: U256::ZERO,
            data: Bytes::default(),
        }
    }

    pub fn chain_id(mut self, chain_id: ChainId) -> Self {
        self.chain_id = chain_id;
        self
    }

    pub fn nonce(mut self, nonce: u64) -> Self {
        self.nonce = nonce;
        self
    }

    pub fn gas_price(mut self, gas_price: U256) -> Self {
        self.gas_price = gas_price;
        self
    }

    pub fn gas_limit(mut self, gas_limit: U256) -> Self {
        self.gas_limit = gas_limit;
        self
    }

    pub fn value(mut self, value: U256) -> Self {
        self.value = value;
        self
    }

    pub fn data(mut self, data: Bytes) -> Self {
        self.data = data;
        self
    }

    pub fn build(self) -> TxLegacy {
        TxLegacy {
            chain_id: Some(self.chain_id.into()),
            nonce: self.nonce,
            gas_price: self.gas_price.to::<u128>(),
            gas_limit: self.gas_limit.to::<u64>(),
            to: TxKind::Call(self.to),
            value: self.value,
            input: self.data,
        }
    }
}
