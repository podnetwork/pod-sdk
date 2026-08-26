# Place a spot order

This guide walks through placing a limit order on one of Pod's spot markets. For background, see [Orderbook](https://docs.v2.pod.network/documentation/markets/orderbook).

Spot orders use the same `submitOrder` call as perpetual orders. Its `flags` argument carries the order's execution properties as a bitfield — pass `0` for a plain resting limit order.

The example below trades the NVDAx-USD spot market — see [Market Configurations](../market-configurations.md) for the full live list.

See the [Orderbook precompile reference](../applications-precompiles/orderbook.md) for the timestamp unit, deadline-alignment, and TTL rules that apply to every call below.

Submit a limit order with price, size, deadline, and TTL. The account needs a balance of the quote token to cover it.

{% tabs %}
{% tab title="TypeScript (ethers.js)" %}
```typescript
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("https://rpc.podtestnet.dev");
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const ORDERBOOK = "0x50d0000000000000000000000000000000000002";
const abi = [
  "function submitOrder(bytes32 orderbookId, int256 size, uint256 price, uint8 orderType, uint128 deadline, uint128 ttl, uint8 flags)",
];

// `flags` bits — OR together the ones you want, 0 for a plain resting limit order
const REDUCE_ONLY = 0x01; // perp only
const IOC = 0x02;
const POST_ONLY = 0x04;

const orderbook = new ethers.Contract(ORDERBOOK, abi, wallet);

// USD is the native token; NVDAx is the synthetic Nvidia base
const USD = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const orderbookId = "0x0000000000000000000000000000000000000000000000000000000000000001"; // NVDAx-USD spot

// Deadlines must be an exact multiple of the market's auction interval
// (500 ms on every testnet market) or validators reject the intent.
const AUCTION_INTERVAL = 500_000n; // microseconds
const deadlineAfter = (lagUs: bigint): bigint =>
  ((BigInt(Date.now()) * 1000n + lagUs + AUCTION_INTERVAL - 1n) / AUCTION_INTERVAL) * AUCTION_INTERVAL;

// Submit a buy limit order: 1 NVDAx at 200 USD
const size = ethers.parseEther("1");         // buy 1 NVDAx (positive = buy)
const price = ethers.parseEther("200");      // limit price in USD
const orderType = 0;                         // 0 = Limit, 1 = Market
const deadline = deadlineAfter(10_000_000n); // include in batches within the next ~10 seconds
const ttl = 60n * 1_000_000n;               // order lives for 60 seconds

const tx = await orderbook.submitOrder(
  orderbookId, size, price, orderType, deadline, ttl,
  0,        // flags — 0 rests on the book; POST_ONLY to guarantee you add liquidity
);
console.log("Order tx:", tx.hash);
```
{% endtab %}

{% tab title="Rust (alloy)" %}
```rust
use alloy::providers::ProviderBuilder;
use alloy::signers::local::PrivateKeySigner;
use alloy::sol;
use alloy::primitives::{Address, U256, I256, FixedBytes};

sol! {
    #[sol(rpc)]
    contract Orderbook {
        enum OrderType { Limit, Market }
        function submitOrder(
            bytes32 orderbookId, int256 size, uint256 price,
            OrderType orderType, uint128 deadline, uint128 ttl,
            uint8 flags
        ) public;
    }
}

// `flags` bits — OR together the ones you want, 0 for a plain resting limit order
const REDUCE_ONLY: u8 = 0x01; // perp only
const IOC: u8 = 0x02;
const POST_ONLY: u8 = 0x04;

let signer: PrivateKeySigner = PRIVATE_KEY.parse()?;
let provider = ProviderBuilder::new()
    .wallet(signer.clone())
    .on_http("https://rpc.podtestnet.dev".parse()?);

let orderbook = Orderbook::new(
    "0x50d0000000000000000000000000000000000002".parse()?,
    &provider,
);

// USD is the native token; NVDAx is the synthetic Nvidia base
let pusd: Address = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE".parse()?;
let orderbook_id = FixedBytes::left_padding_from(&[1]); // NVDAx-USD spot

// Deadlines must be an exact multiple of the market's auction interval
// (500 ms on every testnet market) or validators reject the intent.
const AUCTION_INTERVAL_US: u128 = 500_000;
let now_us = std::time::SystemTime::now()
    .duration_since(std::time::UNIX_EPOCH)?
    .as_micros();
let deadline_after =
    |lag_us: u128| (now_us + lag_us).div_ceil(AUCTION_INTERVAL_US) * AUCTION_INTERVAL_US;

let one_e18 = U256::from(10).pow(U256::from(18));

// Submit a buy limit order: 1 NVDAx at 200 USD
let size = I256::from_raw(one_e18); // buy 1 NVDAx
let price = U256::from(200) * one_e18; // limit price in USD
let deadline = deadline_after(10_000_000); // include in batches within the next ~10 seconds
let ttl = 60 * 1_000_000; // order lives for 60 seconds

let tx = orderbook
    .submitOrder(
        orderbook_id, size, price, Orderbook::OrderType::Limit, deadline, ttl,
        0,            // flags — 0 rests on the book; POST_ONLY to guarantee you add liquidity
    )
    .send().await?;
println!("Order tx: {:?}", tx.tx_hash());
```
{% endtab %}
{% endtabs %}

{% hint style="warning" %}
**Microseconds, not milliseconds.** Deadlines and TTLs are Unix timestamps in microseconds.
{% endhint %}

## Guarantee that you add liquidity

Pass `POST_ONLY` (`0x04`) in `flags` to make the order a guaranteed maker. It rests on the book as usual, but it may not trade in the batch that admitted it: if it would have taken liquidity in that batch, it is removed instead and reported with the terminal status `post_only_refused`. From the next batch onwards it matches like any other resting order.

```typescript
const tx = await orderbook.submitOrder(
  orderbookId, size, price, orderType, deadline, ttl,
  POST_ONLY,
);
```

`POST_ONLY` cannot be combined with `IOC`, and cannot be set on a market order — both are rejected. See [Post-only orders](../applications-precompiles/orderbook.md#post-only-orders) for the exact rules, including what happens when two post-only orders cross each other and how amendments re-arm the guarantee.
