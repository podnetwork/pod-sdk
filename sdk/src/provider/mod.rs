use std::sync::Arc;

pub use alloy_provider;
use alloy_rpc_types::TransactionReceipt;
use anyhow::Context;

use crate::network::{PodNetwork, PodTransactionRequest};
use alloy_json_rpc::{RpcParam, RpcReturn};
use alloy_network::{Network, TransactionBuilder};
use alloy_provider::{
    Identity, PendingTransactionBuilder, Provider, ProviderBuilder, ProviderLayer, RootProvider,
    SendableTx,
    fillers::{JoinFill, RecommendedFillers, TxFiller, WalletFiller},
};
use alloy_pubsub::Subscription;
use async_trait::async_trait;

use alloy_transport::{BoxTransport, Transport, TransportError, TransportResult};
use futures::StreamExt;
use pod_types::{
    consensus::Committee,
    ledger::log::VerifiableLog,
    metadata::{MetadataWrappedItem, RegularReceiptMetadata},
    pagination::{ApiPaginatedResult, CursorPaginationRequest},
};

use alloy_primitives::{Address, B256 as Hash, Log, U256};

use pod_types::Timestamp;
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Serialize, Deserialize)]
pub struct CommitteeResponse(Committee);

impl CommitteeResponse {
    pub fn as_committee(self) -> Committee {
        self.0
    }
}

pub struct PodProviderBuilder<L, F>(ProviderBuilder<L, F, PodNetwork>);

/// Create a PodProviderBuilder set up with recommended settings.
///
/// The builder can be used to build a [Provider] configured for the [PodNetwork].
///
/// The returned builder has fillers preconfigured to automatically fill
/// chain ID, nonce and gas price. Check [PodNetwork::RecommendedFillers] for details.
impl
    PodProviderBuilder<
        Identity,
        JoinFill<Identity, <PodNetwork as RecommendedFillers>::RecommendedFillers>,
    >
{
    pub fn with_recommended_settings() -> Self {
        Self(PodProviderBuilder::default().0.with_recommended_fillers())
    }
}

impl Default for PodProviderBuilder<Identity, Identity> {
    fn default() -> Self {
        Self(ProviderBuilder::new().network::<PodNetwork>())
    }
}

impl PodProviderBuilder<Identity, Identity> {
    pub fn new() -> Self {
        PodProviderBuilder::<Identity, Identity>::default()
    }
}

impl<L, F> PodProviderBuilder<L, F> {
    /// Finish the layer stack by providing a url for connection,
    /// outputting the final [`PodProvider`] type with all stack
    /// components.
    pub async fn on_url<U: AsRef<str>>(
        self,
        url: U,
    ) -> Result<PodProvider<impl Provider<BoxTransport, PodNetwork>, BoxTransport>, TransportError>
    where
        L: ProviderLayer<RootProvider<BoxTransport, PodNetwork>, BoxTransport, PodNetwork>,
        F: TxFiller<PodNetwork> + ProviderLayer<L::Provider, BoxTransport, PodNetwork>,
        F::Provider: 'static,
    {
        let alloy_provider = self.0.on_builtin(url.as_ref()).await?;
        Ok(PodProvider::new(alloy_provider))
    }

    pub fn wallet<W>(self, wallet: W) -> PodProviderBuilder<L, JoinFill<F, WalletFiller<W>>> {
        PodProviderBuilder::<_, _>(self.0.wallet(wallet))
    }

    /// Create [PodProvider] by filling in signer key and RPC url from environment.
    ///
    /// The following env variables need to be configured:
    /// - POD_PRIVATE_KEY: hex-encoded ECDSA private key of the wallet owner
    /// - POD_RPC_URL: URL for a pod RPC API (example: <https://rpc.dev.pod.network>)
    ///   (default: ws://127.0.0.1:8545)
    pub async fn from_env(
        self,
    ) -> anyhow::Result<PodProvider<impl Provider<BoxTransport, PodNetwork>, BoxTransport>> {
        const PK_ENV: &str = "POD_PRIVATE_KEY";
        fn load_private_key() -> anyhow::Result<crate::SigningKey> {
            let pk_string = std::env::var(PK_ENV)?;
            let pk_bytes = hex::decode(pk_string)?;
            let pk = crate::SigningKey::from_slice(&pk_bytes)?;
            Ok(pk)
        }
        let private_key = load_private_key()
            .with_context(|| format!("{PK_ENV} env should contain hex-encoded ECDSA signer key"))?;

        let signer = crate::PrivateKeySigner::from_signing_key(private_key);

        let rpc_url = std::env::var("POD_RPC_URL").unwrap_or("ws://127.0.0.1:8545".to_string());
        let wallet = crate::EthereumWallet::new(signer);

        let provider = PodProviderBuilder::with_recommended_settings()
            .wallet(wallet)
            .on_url(rpc_url.clone())
            .await
            .with_context(|| format!("attaching provider to URL {rpc_url}"))?;

        Ok(provider)
    }
}

/// A provider tailored for pod, extending capabilities of alloy [Provider]
/// with pod-specific features.
pub struct PodProvider<P, T>
where
    T: Transport + Clone,
    P: Provider<T, PodNetwork>,
{
    inner: Arc<P>,
    transport: std::marker::PhantomData<T>,
}

impl<P, T> Clone for PodProvider<P, T>
where
    T: Transport + Clone,
    P: Provider<T, PodNetwork>,
{
    fn clone(&self) -> Self {
        Self {
            inner: self.inner.clone(),
            transport: self.transport,
        }
    }
}

#[cfg_attr(target_arch = "wasm32", async_trait(?Send))]
#[cfg_attr(not(target_arch = "wasm32"), async_trait)]
impl<P, T> Provider<T, PodNetwork> for PodProvider<P, T>
where
    T: Transport + Clone,
    P: Provider<T, PodNetwork>,
{
    fn root(&self) -> &RootProvider<T, PodNetwork> {
        self.inner.root()
    }

    // NOTE: we need to override send_transaction_internal because it is
    // overriden in [FillProvider], which we use internally in `inner.
    // Otherwise, we would call the default implementation, which is different.
    // Perhaps we should do this for all methods?
    async fn send_transaction_internal(
        &self,
        tx: SendableTx<PodNetwork>,
    ) -> TransportResult<PendingTransactionBuilder<T, PodNetwork>> {
        self.inner.send_transaction_internal(tx).await
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Notification {
    pub event: (Log, Hash),
    pub timestamp: Timestamp,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct EventNotification(Log, Hash);

#[allow(dead_code)]
#[derive(Error, Debug)]
pub enum LogVerificationError {
    #[error("missing transaction hash")]
    MissingTransactionHash,
    #[error("rpc error: {0}")]
    RPCError(#[from] alloy_json_rpc::RpcError<alloy_transport::TransportErrorKind>),
    #[error("receipt not found: {0}")]
    ReceiptNotFound(Hash),
    #[error("invalid receipt response")]
    InvalidReceiptResponse,
}

impl<P, T> PodProvider<P, T>
where
    T: Transport + Clone,
    P: Provider<T, PodNetwork>,
{
    /// Create a new [PodProvider] using the underlying alloy [Provider].
    pub fn new(provider: P) -> Self {
        Self {
            inner: Arc::new(provider),
            transport: std::marker::PhantomData::<T>,
        }
    }

    /// Gets the current committee members
    pub async fn get_committee(&self) -> TransportResult<Committee> {
        self.client().request_noparams("pod_getCommittee").await
    }

    pub async fn get_verifiable_logs(
        &self,
        filter: &alloy_rpc_types::Filter,
    ) -> TransportResult<Vec<VerifiableLog>> {
        self.client().request("eth_getLogs", (filter,)).await
    }

    pub async fn websocket_subscribe<Params, Resp>(
        &self,
        method: &str,
        params: Params,
    ) -> TransportResult<Subscription<Resp>>
    where
        Params: RpcParam,
        Resp: RpcReturn,
    {
        let id = self
            .client()
            .request("eth_subscribe", (method, params))
            .await?;
        self.root().get_subscription(id).await
    }

    pub async fn subscribe_verifiable_logs(
        &self,
        filter: &alloy_rpc_types::Filter,
    ) -> TransportResult<Subscription<VerifiableLog>> {
        self.websocket_subscribe("logs", filter).await
    }

    pub async fn wait_past_perfect_time(&self, timestamp: u64) -> TransportResult<()> {
        loop {
            let subscription: Subscription<String> = self
                .websocket_subscribe("pod_pastPerfectTime", timestamp)
                .await?;
            // returns None if connection closes before a notification was sent
            let first_notification = subscription.into_stream().next().await;
            if first_notification.is_some() {
                break;
            }
        }
        Ok(())
    }

    /// Subscribe to continuously receive TX receipts as they are created on the node.
    ///
    /// The parameters `address` and `since` allow to optionally filter receipts.
    /// Pass `None` and `Timestamp::zero()` respectively for wildcards.
    pub async fn subscribe_receipts(
        &self,
        address: Option<Address>,
        since: Timestamp,
    ) -> TransportResult<
        Subscription<MetadataWrappedItem<TransactionReceipt, RegularReceiptMetadata>>,
    > {
        self.websocket_subscribe("pod_receipts", (address, since))
            .await
    }

    pub async fn get_confirmed_receipts(
        &self,
        since_micros: u64,
        paginator: Option<CursorPaginationRequest>,
    ) -> TransportResult<ApiPaginatedResult<<PodNetwork as Network>::ReceiptResponse>> {
        self.client()
            .request("pod_listConfirmedReceipts", &(since_micros, paginator))
            .await
    }

    pub async fn get_account_receipts(
        &self,
        address: Address,
        since_micros: u64,
        paginator: Option<CursorPaginationRequest>,
    ) -> TransportResult<ApiPaginatedResult<<PodNetwork as Network>::ReceiptResponse>> {
        self.client()
            .request(
                "pod_listAccountReceipts",
                &(address, since_micros, paginator),
            )
            .await
    }

    /// Transfer specified `amount` funds to the `to` account.
    pub async fn transfer(
        &self,
        to: Address,
        amount: U256,
    ) -> Result<<PodNetwork as Network>::ReceiptResponse, Box<dyn std::error::Error>> {
        let tx = PodTransactionRequest::default()
            .with_to(to)
            .with_value(amount);

        let pending_tx = self.send_transaction(tx).await?;

        let receipt = pending_tx.get_receipt().await?;

        Ok(receipt)
    }
}
