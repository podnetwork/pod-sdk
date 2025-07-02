//! A Rust SDK for interacting with pod network.
//!
//! # Usage
//!
//! First, add this to your `Cargo.toml`:
//!
//! ```toml
//! [dependencies]
//! pod-sdk = "0.1.0"
//! ```
//!
//! ## Querying account balance
//!
//! ```no_run
//! use std::str::FromStr;
//! use pod_sdk::{Address, Provider, provider::PodProviderBuilder};
//!
//! let rpc_url = "ws://localhost:8545";
//! let account = Address::from_str("0xC7096D019F96faE581361aFB07311cd6D3a25596").unwrap();
//!
//! # tokio_test::block_on(async {
//! let pod_provider = PodProviderBuilder::new().on_url(rpc_url).await.unwrap();
//! pod_provider.get_balance(account).await.unwrap();
//! # })
//! ```
//!
//! ## Sending a transfer
//!
//! ```no_run
//! use std::str::FromStr;
//! use pod_sdk::{Address, EthereumWallet, provider::PodProviderBuilder, PrivateKeySigner, SigningKey, U256};
//!
//! let rpc_url = "ws://localhost:8545";
//! let private_key_bytes = hex::decode("9a3f1b8475d296f2e7c1a3d5986b34c7f4de1bc2093a60f8be4f7dcaa12389ef").unwrap();
//! let private_key = SigningKey::from_slice(&private_key_bytes).unwrap();
//! let signer = PrivateKeySigner::from_signing_key(private_key);
//! let wallet = EthereumWallet::new(signer);
//!
//! let to = Address::from_str("0xC7096D019F96faE581361aFB07311cd6D3a25596").unwrap();
//! let amount = U256::from(1000);
//!
//! # tokio_test::block_on(async {
//! // `with_recommended_settings` sets it up to fill gas, nonce and chain ID automatically
//! let pod_provider = PodProviderBuilder::with_recommended_settings()
//!      // pass wallet to send funds from and to sign the transaction
//!     .wallet(wallet)
//!     // An URL to a fullnode RPC API
//!     .on_url(rpc_url)
//!     .await
//!     .unwrap();
//!
//! pod_provider.transfer(to, amount).await.unwrap();
//! # })
//!```
//!
//! ## Configuring [provider::PodProvider] from environment variables
//!
//! The RPC url and a single private key, which will be used
//! to sign transactions, can be loaded from the env.
//! Check out [provider::PodProviderBuilder::from_env] for details.
//!
//! ```no_run
//! // export POD_PRIVATE_KEY=9a3f1b8475d296f2e7c1a3d5986b34c7f4de1bc2093a60f8be4f7dcaa12389ef
//! // export POD_RPC_URL=https://rpc.dev.pod.network
//! use std::str::FromStr;
//! use pod_sdk::{Address, provider::PodProviderBuilder, U256};
//!
//! let to = Address::from_str("0xC7096D019F96faE581361aFB07311cd6D3a25596").unwrap();
//! let amount = U256::from(1000);
//!
//! # tokio_test::block_on(async {
//! let pod_provider = PodProviderBuilder::with_recommended_settings()
//!     .from_env()
//!     .await
//!     .unwrap();
//!
//! pod_provider.transfer(to, amount).await.unwrap();
//! # })
//! ```

pub mod network;
pub mod provider;

// Re-export external dependencies used in public API
pub use alloy_consensus::TxLegacy;
pub use alloy_network::{EthereumWallet, TransactionBuilder};
pub use alloy_primitives::{Address, Bytes, TxKind, B256 as Hash, U256};
pub use alloy_provider::{Provider, ProviderBuilder};
pub use alloy_signer::k256::ecdsa::SigningKey;
pub use alloy_signer_local::PrivateKeySigner;

// Re-export external dependency crates
pub use alloy_primitives;
pub use alloy_rpc_types;
pub use alloy_signer;
pub use alloy_sol_types;

// Re-export types types used in public API
pub use pod_types::{
    consensus::attestation::HeadlessAttestation, Certificate, Receipt, Transaction,
};
