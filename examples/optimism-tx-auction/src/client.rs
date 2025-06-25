use alloy::sol_types::SolEvent;
use anyhow::Context;
use pod_sdk::{
    Address, U256,
    provider::{PodProvider, PodProviderBuilder},
};
use pod_types::rpc::filter::LogFilterBuilder;
use tokio::sync::OnceCell;

use crate::bindings::Auction::BidSubmitted;

pub struct AuctionClient {
    rpc_url: String,
    provider: OnceCell<PodProvider>,
    contract: Address,
}

pub struct Bid {
    pub amount: U256,
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

    pub async fn bids(&self, deadline_secs: u64) -> anyhow::Result<Vec<Bid>> {
        let provider = self
            .provider
            .get_or_try_init(|| {
                PodProviderBuilder::with_recommended_settings().on_url(&self.rpc_url)
            })
            .await?;

        // TODO: wait for past perfect deadline?
        // It's problematic right now because PPT is hardocded to 5 seconds after requested
        // timestamps on fullnode side.

        let filter = LogFilterBuilder::new()
            .address(self.contract)
            .event_signature(BidSubmitted::SIGNATURE_HASH)
            .topic1(U256::from(deadline_secs))
            .build();

        let logs = provider.get_verifiable_logs(&filter).await?;
        let comittee = provider.get_committee().await?;
        logs.into_iter()
            .map(|log| {
                log.verify(&comittee)
                    .context("obtained bid log is not valid")?;

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
