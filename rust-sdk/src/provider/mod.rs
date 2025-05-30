use std::sync::Arc;

pub use alloy_provider;
use alloy_rpc_types::TransactionReceipt;
use anyhow::Context;

use crate::network::{PodNetwork, PodTransactionRequest};
use alloy_json_rpc::{RpcRecv, RpcSend};
use alloy_network::{EthereumWallet, Network, NetworkWallet, TransactionBuilder};
use alloy_provider::{
    fillers::{JoinFill, RecommendedFillers, TxFiller, WalletFiller},
    Identity, PendingTransactionBuilder, Provider, ProviderBuilder, ProviderLayer, RootProvider,
    SendableTx,
};
use alloy_pubsub::Subscription;
use async_trait::async_trait;

use alloy_transport::{TransportError, TransportResult};
use futures::StreamExt;
use pod_types::{
    consensus::Committee,
    ledger::log::VerifiableLog,
    metadata::{MetadataWrappedItem, RegularReceiptMetadata},
    pagination::{ApiPaginatedResult, CursorPaginationRequest},
};

use alloy_primitives::{Address, U256};

use pod_types::Timestamp;

pub struct PodProviderBuilder<L, F>(ProviderBuilder<L, F, PodNetwork>);

impl
    PodProviderBuilder<
        Identity,
        JoinFill<Identity, <PodNetwork as RecommendedFillers>::RecommendedFillers>,
    >
{
    /// Create a PodProviderBuilder set up with recommended settings.
    ///
    /// The builder can be used to build a [Provider] configured for the [PodNetwork].
    ///
    /// The returned builder has fillers preconfigured to automatically fill
    /// chain ID, nonce and gas price. Check [PodNetwork::RecommendedFillers] for details.
    pub fn with_recommended_settings() -> Self {
        Self(PodProviderBuilder::default().0.with_recommended_fillers())
    }
}

impl Default for PodProviderBuilder<Identity, Identity> {
    fn default() -> Self {
        Self(ProviderBuilder::<_, _, PodNetwork>::default())
    }
}

impl PodProviderBuilder<Identity, Identity> {
    pub fn new() -> Self {
        Self::default()
    }
}

impl<L, F> PodProviderBuilder<L, F> {
    /// Finish the layer stack by providing a url for connection,
    /// outputting the final [`PodProvider`] type with all stack
    /// components.
    pub async fn on_url<U: AsRef<str>>(self, url: U) -> Result<PodProvider, TransportError>
    where
        L: ProviderLayer<RootProvider<PodNetwork>, PodNetwork>,
        F: TxFiller<PodNetwork> + ProviderLayer<L::Provider, PodNetwork>,
        F::Provider: 'static,
    {
        let alloy_provider = self.0.connect(url.as_ref()).await?;
        Ok(PodProvider::new(alloy_provider))
    }

    /// Configure a wallet to be used for signing transactions and spending funds.
    pub fn wallet<W>(self, wallet: W) -> PodProviderBuilder<L, JoinFill<F, WalletFiller<W>>>
    where
        W: NetworkWallet<PodNetwork>,
    {
        PodProviderBuilder::<_, _>(self.0.wallet(wallet))
    }

    pub fn with_private_key(
        self,
        key: crate::SigningKey,
    ) -> PodProviderBuilder<L, JoinFill<F, WalletFiller<EthereumWallet>>> {
        let signer = crate::PrivateKeySigner::from_signing_key(key);

        self.wallet(crate::EthereumWallet::new(signer))
    }

    /// Create [PodProvider] by filling in signer key and RPC url from environment.
    ///
    /// The following env variables need to be configured:
    /// - POD_PRIVATE_KEY: hex-encoded ECDSA private key of the wallet owner
    /// - POD_RPC_URL: URL for a pod RPC API (example: <https://rpc.dev.pod.network>)
    ///   (default: ws://127.0.0.1:8545)
    pub async fn from_env(self) -> anyhow::Result<PodProvider>
    where
        L: ProviderLayer<RootProvider<PodNetwork>, PodNetwork>,
        F: TxFiller<PodNetwork> + ProviderLayer<L::Provider, PodNetwork> + 'static,
        L::Provider: 'static,
    {
        const PK_ENV: &str = "POD_PRIVATE_KEY";
        fn load_private_key() -> anyhow::Result<crate::SigningKey> {
            let pk_string = std::env::var(PK_ENV)?;
            let pk_bytes = hex::decode(pk_string)?;
            let pk = crate::SigningKey::from_slice(&pk_bytes)?;
            Ok(pk)
        }
        let private_key = load_private_key()
            .with_context(|| format!("{PK_ENV} env should contain hex-encoded ECDSA signer key"))?;

        let rpc_url = std::env::var("POD_RPC_URL").unwrap_or("ws://127.0.0.1:8545".to_string());

        let provider = self
            .with_private_key(private_key)
            .on_url(rpc_url.clone())
            .await
            .with_context(|| format!("attaching provider to URL {rpc_url}"))?;

        Ok(provider)
    }
}

/// A provider tailored for pod, extending capabilities of alloy [Provider]
/// with pod-specific features.
pub struct PodProvider {
    inner: Arc<dyn Provider<PodNetwork>>,
}

impl Clone for PodProvider {
    fn clone(&self) -> Self {
        Self {
            inner: self.inner.clone(),
        }
    }
}

#[cfg_attr(target_arch = "wasm32", async_trait(?Send))]
#[cfg_attr(not(target_arch = "wasm32"), async_trait)]
impl Provider<PodNetwork> for PodProvider {
    fn root(&self) -> &RootProvider<PodNetwork> {
        self.inner.root()
    }

    // NOTE: we need to override send_transaction_internal because it is
    // overriden in [FillProvider], which we use internally in `inner.
    // Otherwise, we would call the default implementation, which is different.
    // Perhaps we should do this for all methods?
    async fn send_transaction_internal(
        &self,
        tx: SendableTx<PodNetwork>,
    ) -> TransportResult<PendingTransactionBuilder<PodNetwork>> {
        self.inner.send_transaction_internal(tx).await
    }
}

impl PodProvider {
    /// Create a new [PodProvider] using the underlying alloy [Provider].
    pub fn new(provider: impl Provider<PodNetwork> + 'static) -> Self {
        Self {
            inner: Arc::new(provider),
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
        Params: RpcSend,
        Resp: RpcRecv,
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

    pub async fn wait_past_perfect_time(&self, timestamp: Timestamp) -> TransportResult<()> {
        loop {
            let subscription: Subscription<String> = self
                .websocket_subscribe("pod_pastPerfectTime", timestamp.as_micros())
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

    pub async fn get_receipts(
        &self,
        address: Option<Address>,
        since_micros: u64,
        paginator: Option<CursorPaginationRequest>,
    ) -> TransportResult<ApiPaginatedResult<<PodNetwork as Network>::ReceiptResponse>> {
        self.client()
            .request("pod_listReceipts", &(address, since_micros, paginator))
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
