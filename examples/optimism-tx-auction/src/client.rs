use std::time::Duration;

use alloy::sol_types::SolEvent;
use anyhow::Context;
use pod_sdk::{
    Address, U256,
    provider::{PodProvider, PodProviderBuilder},
};
use pod_types::{Timestamp, rpc::filter::LogFilterBuilder};
use tokio::sync::OnceCell;

use crate::bindings::Auction::BidSubmitted;

pub struct AuctionClient {
    rpc_url: String,
    provider: OnceCell<PodProvider>,
    contract: Address,
}

pub struct Bid {
    pub amount: u128,
    pub data: Vec<u8>,
}

impl AuctionClient {
    pub async fn new(rpc_url: String, contract: Address) -> Self {
        AuctionClient {
            rpc_url,
            provider: OnceCell::new(),
            contract,
        }
    }

    #[tracing::instrument(skip(self))]
    pub async fn bids(&self, deadline_secs: u64) -> anyhow::Result<Vec<Bid>> {
        let provider = self
            .provider
            .get_or_try_init(|| {
                PodProviderBuilder::with_recommended_settings().on_url(&self.rpc_url)
            })
            .await?;

        tracing::info!("waiting for past perfect time");
        provider
            // FIXME: The current PPT implementation in pod is dummy and waits 5s which is far too long.
            // Remove - 5s + 200ms when it's fixed.
            .wait_past_perfect_time(
                Timestamp::from_seconds(deadline_secs) - Duration::from_secs(5)
                    + Duration::from_millis(200),
            )
            .await
            .context("waiting for the provider to be ready")?;
        tracing::info!("past perfect time reached");

        let filter = LogFilterBuilder::new()
            .address(self.contract)
            .event_signature(BidSubmitted::SIGNATURE_HASH)
            .topic1(U256::from(deadline_secs))
            .build();

        let logs = provider.get_verifiable_logs(&filter).await?;
        logs.into_iter()
            .map(|log| {
                let event = BidSubmitted::decode_log(&log.inner.inner)
                    .context("failed to decode bid log")?
                    .data;
                Ok(Bid {
                    amount: event.bid,
                    data: event.data.to_vec(),
                })
            })
            .collect()
    }
}
