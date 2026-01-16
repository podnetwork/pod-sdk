# Auction Settlement Example

An NFT auction system that demonstrates how Pod enables fair settlement **without total ordering**. Auctioneers can sell NFT trophies for ERC20 tokens, with winners determined by the highest bid submitted before the deadline.

## How It Works

The auction contract achieves fair settlement despite lack of total ordering allowing for extremely fast finality and minimal overhead, providing the following guarantees:

- Short-term censorship resistance: There is no leader or sequencer that can censor bids for a short time.
- Bid submission deadline: Only bids submitted before the deadline can win.

Even though transactions may be processed in different orders across Pod nodes, the contract can still determine the correct winner and settle fairly.

Because bids must be submitted in time, it is crucial that a client submits both rounds of execution to pod before the auction deadline to a supermajority of the validators. If the client fails to do so and only submits the transaction to some of the validators, the bid is considered malicious and the client may lose the money he bid for the auction without being able to refund.

## Usage

### Build and Test

```bash
forge build
forge test
```

### Deploy

```bash
forge script script/Auction.s.sol --rpc-url <pod_rpc_url> --private-key <key> --broadcast
```

### Using Cast

```bash
# Start an auction (returns auction ID)
cast send <auction_contract> "startAuction(address,uint256,address,uint64)" \
  <nft_contract> <token_id> <payment_token> <deadline_timestamp> \
  --rpc-url <pod_rpc_url> --private-key <key>

# Submit a bid
cast send <auction_contract> "submitBid(uint256,uint256)" \
  <auction_id> <bid_amount> \
  --rpc-url <pod_rpc_url> --private-key <key>

# After deadline - winner claims trophy
cast send <auction_contract> "claimTrophy(uint256,uint256)" \
  <auction_id> <winning_bid_id> \
  --rpc-url <pod_rpc_url> --private-key <key>

# Losers get refunds by proving a higher bid exists
cast send <auction_contract> "refundBid(uint256,uint256,uint256)" \
  <auction_id> <losing_bid_id> <higher_bid_id> \
  --rpc-url <pod_rpc_url> --private-key <key>
```

### Core Functions

- `startAuction()` - Creates auction and escrows NFT trophy
- `submitBid()` - Places bid with ERC20 payment (accepted even after deadline)
- `claimTrophy()` - Winner claims NFT after deadline using quorum proof
- `refundBid()` - Losers reclaim tokens by proving a higher bid
- `claimPayout()` - Auctioneer receives winning bid amount


## License

MIT
