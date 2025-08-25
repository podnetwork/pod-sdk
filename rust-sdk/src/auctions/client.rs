use std::time::SystemTime;

use crate::{
    network::{PodNetwork, PodReceiptResponse},
    provider::PodProvider,
    Address, U256,
};
use alloy_eips::BlockNumberOrTag;
use anyhow::Context;

use pod_contracts::auction::Auction::AuctionInstance;
use pod_types::Timestamp;

pub struct AuctionClient {
    pub auction: AuctionInstance<PodProvider, PodNetwork>,
}

pub struct Bid {
    pub amount: U256,
    pub bidder: Address,
    pub data: Vec<u8>,
}

impl AuctionClient {
    pub fn new(provider: PodProvider, contract: Address) -> Self {
        AuctionClient {
            auction: AuctionInstance::new(contract, provider),
        }
    }

    #[tracing::instrument(skip(self))]
    pub async fn wait_for_auction_end(&self, deadline: SystemTime) -> anyhow::Result<()> {
        Ok(self
            .auction
            .provider()
            .wait_past_perfect_time(deadline.into())
            .await?)
    }

    #[tracing::instrument(skip(self))]
    pub async fn fetch_bids(&self, auction_id: U256) -> anyhow::Result<Vec<Bid>> {
        let logs = self
            .auction
            .BidSubmitted_filter()
            .topic1(auction_id)
            .to_block(BlockNumberOrTag::Latest)
            .query()
            .await
            .context("fetching bid logs")?;

        logs.into_iter()
            .map(|(event, _)| {
                Ok(Bid {
                    amount: event.value,
                    bidder: event.bidder,
                    data: event.data.to_vec(),
                })
            })
            .collect()
    }

    #[tracing::instrument(skip(self))]
    pub async fn fetch_bids_for_deadline(&self, deadline: SystemTime) -> anyhow::Result<Vec<Bid>> {
        let deadline_us = Timestamp::from(deadline).as_micros();

        let logs = self
            .auction
            .BidSubmitted_filter()
            .topic3(U256::from(deadline_us))
            .to_block(BlockNumberOrTag::Latest)
            .query()
            .await
            .context("fetching bid logs")?;

        logs.into_iter()
            .map(|(event, _)| {
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
        let deadline_ts = Timestamp::from(deadline);
        let deadline = deadline_ts
            .as_micros()
            .try_into()
            .context("deadline seconds must fit in u64")?;

        let pending_tx = self
            .auction
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
