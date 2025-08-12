use std::time::SystemTime;

use crate::{network::PodReceiptResponse, provider::PodProvider, Address, U256};
use alloy_provider::Provider;
use alloy_rpc_types::Filter;
use alloy_sol_types::SolEvent;
use anyhow::Context;

use pod_contracts::auction::Auction;
use pod_types::Timestamp;

pub struct AuctionClient {
    provider: PodProvider,
    contract: Address,
}

pub struct Bid {
    pub amount: U256,
    pub bidder: Address,
    pub data: Vec<u8>,
}

impl AuctionClient {
    pub fn new(provider: PodProvider, contract: Address) -> Self {
        AuctionClient { provider, contract }
    }

    #[tracing::instrument(skip(self))]
    pub async fn wait_for_auction_end(&self, deadline: SystemTime) -> anyhow::Result<()> {
        Ok(self
            .provider
            .wait_past_perfect_time(deadline.into())
            .await?)
    }

    #[tracing::instrument(skip(self))]
    pub async fn fetch_bids(&self, auction_id: U256) -> anyhow::Result<Vec<Bid>> {
        let filter = Filter::new()
            .address(self.contract)
            .event_signature(Auction::BidSubmitted::SIGNATURE_HASH)
            .topic1(auction_id);

        let logs = self
            .provider
            .get_logs(&filter)
            .await
            .context("getting logs")?;

        logs.into_iter()
            .map(|log| {
                let event = Auction::BidSubmitted::decode_log(&log.inner, true)
                    .context("failed to decode bid log")?
                    .data;
                Ok(Bid {
                    amount: event.value,
                    bidder: event.bidder,
                    data: event.data.to_vec(),
                })
            })
            .collect()
    }

    pub async fn submit_bid(
        &self,
        auction_id: U256,
        deadline: SystemTime,
        bid: U256,
        data: Vec<u8>,
    ) -> anyhow::Result<PodReceiptResponse> {
        let auction = Auction::AuctionInstance::new(self.contract, self.provider.clone());

        let deadline_ts = Timestamp::from(deadline);
        let deadline = deadline_ts
            .as_micros()
            .try_into()
            .context("deadline seconds must fit in u64")?;

        let pending_tx = auction
            .submitBid(auction_id, deadline, bid, data.into())
            .max_priority_fee_per_gas(0)
            .send()
            .await
            .context("sending bid TX")?;

        let receipt = pending_tx
            .get_receipt()
            .await
            .context("awaiting for bid TX confirmation")?;

        anyhow::ensure!(receipt.status(), "failed to submit bid TX");
        Ok(receipt)
    }
}
