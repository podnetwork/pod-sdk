use crate::network::{PodNetwork, PodReceiptResponse};
use alloy_json_rpc::{RpcParam, RpcReturn};
use alloy_network::Network;
use alloy_provider::{Identity, Provider, ProviderBuilder};
use alloy_pubsub::Subscription;
use alloy_rpc_types_eth::Filter;
use alloy_transport::{Transport, TransportResult};
use futures::StreamExt;
use pod_types::consensus::Committee;
use pod_types::ledger::log::VerifiableLog;
use pod_types::pagination::ApiPaginatedResult;
use pod_types::pagination::CursorPaginationRequest;

use alloy_primitives::{Address, Log, B256 as Hash};

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

pub struct PodProviderBuilder;

impl PodProviderBuilder {
    #[allow(clippy::new_ret_no_self)]
    pub fn new() -> ProviderBuilder<Identity, Identity, PodNetwork> {
        ProviderBuilder::new().network::<PodNetwork>()
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

/// Extension trait that adds Pod-specific methods to any Provider with PodNetwork
#[cfg_attr(target_arch = "wasm32", async_trait::async_trait(?Send))]
#[cfg_attr(not(target_arch = "wasm32"), async_trait::async_trait)]
pub trait PodProviderExt<T: Transport + Clone>: Provider<T, PodNetwork> {
    /// Gets the current committee members
    async fn get_committee(&self) -> TransportResult<Committee> {
        self.client().request_noparams("pod_getCommittee").await
    }

    async fn get_verifiable_logs(&self, filter: &Filter) -> TransportResult<Vec<VerifiableLog>> {
        self.client().request("eth_getLogs", (filter,)).await
    }

    async fn websocket_subscribe<Params, Resp>(
        &self,
        method: &str,
        params: Params,
    ) -> TransportResult<Subscription<Resp>>
    where
        Params: RpcParam,
        Resp: RpcReturn,
        // Bounds from impl:
        T: Transport + Clone,
    {
        let id = self
            .client()
            .request("eth_subscribe", (method, params))
            .await?;
        self.root().get_subscription(id).await
    }

    async fn subscribe_verifiable_logs(
        &self,
        filter: &Filter,
    ) -> TransportResult<Subscription<VerifiableLog>> {
        self.websocket_subscribe("logs", filter).await
    }

    async fn wait_past_perfect_time(&self, timestamp: u64) -> TransportResult<()> {
        loop {
            let subscription: Subscription<String> = self
                .websocket_subscribe("pod_pastPerfectTime", timestamp)
                .await?;
            println!("subscription {:?}", subscription);
            // returns None if connection closes before a notification was sent
            let first_notification = subscription.into_stream().next().await;
            println!("first notification {:?}", first_notification);
            if first_notification.is_some() {
                break;
            }
        }
        Ok(())
    }

    async fn subscribe_confirmed_receipts(
        &self,
    ) -> TransportResult<Subscription<PodReceiptResponse>> {
        self.websocket_subscribe("pod_confirmedReceipts", None::<()>)
            .await
    }

    async fn subscribe_account_receipts(
        &self,
        account: &Address,
    ) -> TransportResult<Subscription<PodReceiptResponse>> {
        self.websocket_subscribe("pod_accountReceipts", account)
            .await
    }

    async fn get_confirmed_receipts(
        &self,
        since_micros: u64,
        paginator: Option<CursorPaginationRequest>,
    ) -> TransportResult<ApiPaginatedResult<<PodNetwork as Network>::ReceiptResponse>> {
        self.client()
            .request("pod_listConfirmedReceipts", &(since_micros, paginator))
            .await
    }
}

// Implement for any Provider type that uses PodNetwork
impl<T, P> PodProviderExt<T> for P
where
    T: Transport + Clone,
    P: Provider<T, PodNetwork>,
{
}
