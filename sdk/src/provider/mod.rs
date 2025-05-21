use std::sync::Arc;

pub use alloy_provider;

use crate::network::{PodNetwork, PodReceiptResponse, PodTransactionRequest};
use alloy_json_rpc::{RpcParam, RpcReturn};
use alloy_network::{Network, TransactionBuilder};
use alloy_provider::{
    Identity, Provider, ProviderBuilder, ProviderLayer, RootProvider,
    fillers::{JoinFill, RecommendedFillers, TxFiller, WalletFiller},
};
use alloy_pubsub::Subscription;

use alloy_transport::{BoxTransport, Transport, TransportError, TransportResult};
use futures::StreamExt;
use pod_types::{
    consensus::Committee,
    ledger::log::VerifiableLog,
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
    pub async fn on_url(
        self,
        s: &str,
    ) -> Result<PodProvider<impl Provider<BoxTransport, PodNetwork>, BoxTransport>, TransportError>
    where
        L: ProviderLayer<RootProvider<BoxTransport, PodNetwork>, BoxTransport, PodNetwork>,
        F: TxFiller<PodNetwork> + ProviderLayer<L::Provider, BoxTransport, PodNetwork>,
        F::Provider: 'static,
    {
        let alloy_provider = self.0.on_builtin(s).await?;
        Ok(PodProvider::new(alloy_provider))
    }

    pub fn wallet<W>(self, wallet: W) -> PodProviderBuilder<L, JoinFill<F, WalletFiller<W>>> {
        PodProviderBuilder::<_, _>(self.0.wallet(wallet))
    }
}

/// A provider tailored for pod, extending capabilities of alloy [Provider]
/// with pod-specific features.
#[derive(Clone)]
pub struct PodProvider<P, T>
where
    T: Transport + Clone,
    P: Provider<T, PodNetwork>,
{
    inner: Arc<P>,
    transport: std::marker::PhantomData<T>,
}

impl<P, T> Provider<T, PodNetwork> for PodProvider<P, T>
where
    T: Transport + Clone,
    P: Provider<T, PodNetwork>,
{
    fn root(&self) -> &RootProvider<T, PodNetwork> {
        self.inner.root()
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

    pub async fn subscribe_confirmed_receipts(
        &self,
    ) -> TransportResult<Subscription<PodReceiptResponse>> {
        self.websocket_subscribe("pod_confirmedReceipts", None::<()>)
            .await
    }

    pub async fn subscribe_account_receipts(
        &self,
        account: &Address,
    ) -> TransportResult<Subscription<PodReceiptResponse>> {
        self.websocket_subscribe("pod_accountReceipts", account)
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

    /// Transfer specified `amount` funds to the `to` account.
    pub async fn transfer(
        &self,
        to: Address,
        amount: U256,
    ) -> Result<<PodNetwork as Network>::ReceiptResponse, Box<dyn std::error::Error>> {
        let tx = PodTransactionRequest::default()
            .with_to(to)
            .with_value(amount);

        let pending_tx = self.inner.send_transaction(tx).await?;

        let receipt = pending_tx.get_receipt().await?;

        Ok(receipt)
    }
}
