pub mod network;
pub mod provider;
pub mod types;

pub use types::{
    ChainId, EventFilter, EventProof, Hash, LegacyTransactionBuilder, TransactionReceipt,
    VerifiedLog,
};

// Re-export external dependencies used in public API
pub use alloy_consensus::TxLegacy;
pub use alloy_network::{EthereumWallet, TransactionBuilder};
pub use alloy_primitives::{Address, Bytes, TxKind, U256};
pub use alloy_provider::{Provider, ProviderBuilder};
pub use alloy_signer_local::PrivateKeySigner;

// Re-export types types used in public API
pub use pod_types::{
    consensus::attestation::HeadlessAttestation,
    cryptography::ecdsa::{AddressECDSA, SignatureECDSA},
    Certificate, Receipt, Transaction,
};
