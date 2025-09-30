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
    // Convert SystemTime -> microseconds as `u128`.
    fn micros_from_system_time(deadline: SystemTime) -> u128 {
        Timestamp::from(deadline).as_micros()
    }

    // Convert SystemTime -> microseconds as `u64`, failing with a clear message on overflow.
    fn micros_u64_from_system_time(deadline: SystemTime) -> anyhow::Result<u64> {
        let micros = Self::micros_from_system_time(deadline);
        micros
            .try_into()
            .context("deadline microseconds must fit in u64")
    }

    // Convert SystemTime -> microseconds as `U256` for contract topics.
    fn micros_u256_from_system_time(deadline: SystemTime) -> U256 {
        U256::from(Self::micros_from_system_time(deadline))
    }

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
        let deadline_us = Self::micros_u256_from_system_time(deadline);

        let logs = self
            .auction
            .BidSubmitted_filter()
            .topic3(deadline_us)
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
        let deadline = Self::micros_u64_from_system_time(deadline)?;

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
