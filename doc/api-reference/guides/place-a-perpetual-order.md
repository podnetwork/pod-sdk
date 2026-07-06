# Place a perpetual order

This guide walks through opening a leveraged perpetual position on one of Pod's perp markets. For background, see [Perpetuals](https://docs.v2.pod.network/documentation/markets/perpetuals) and [Market Configurations](../market-configurations.md) for the live perp market list.

Perpetual markets are quoted in **USD** and use cross-margin: a single USD deposit serves as collateral for all open perp positions on the account. `size` is the order quantity in **base-asset units** and is signed — positive opens a long, negative opens a short. Margin is computed by the market from `|size| × markPrice / maxLeverage` (the mark price, not the order's limit price), adjusted by the mark-to-limit difference.

See the [Orderbook precompile reference](../applications-precompiles/orderbook.md) for the timestamp unit, deadline-alignment, and TTL rules that apply to every call below.

## Steps

1. Deposit USD as margin into the orderbook contract.
2. Submit a limit order for the perp market (e.g. NVDA-USD).

{% tabs %}
{% tab title="TypeScript (ethers.js)" %}
```typescript
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("https://rpc.podtestnet.dev");
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const ORDERBOOK = "0x50d0000000000000000000000000000000000002";
const abi = [
  "function deposit(address token, address recipient, uint256 amount, uint128 deadline)",
  "function submitOrder(bytes32 orderbookId, int256 size, uint256 price, uint8 orderType, uint128 deadline, uint128 ttl, uint8 flags)",
];

// `flags` bits — OR together the ones you want, 0 for a plain resting limit order
const REDUCE_ONLY = 0x01;
const IOC = 0x02;
const POST_ONLY = 0x04;

const orderbook = new ethers.Contract(ORDERBOOK, abi, wallet);

// USD is Pod's native token — use the canonical native-token sentinel address
const USD = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const nvdaPerpId = "0x0000000000000000000000000000000000000000000000000000000000000007"; // NVDA-USD perp (max 20x)

// Deadlines must be an exact multiple of the market's auction interval
// (500 ms on every testnet market) or validators reject the intent.
const AUCTION_INTERVAL = 500_000n; // microseconds
const deadlineAfter = (lagUs: bigint): bigint =>
  ((BigInt(Date.now()) * 1000n + lagUs + AUCTION_INTERVAL - 1n) / AUCTION_INTERVAL) * AUCTION_INTERVAL;

// 1. Deposit USD margin
const margin = ethers.parseEther("1000"); // 1,000 USD
await (await orderbook.deposit(USD, wallet.address, margin, deadlineAfter(60_000_000n))).wait();

// 2. Open a long on NVDA-USD: 5 NVDA at $140 limit
const size = ethers.parseEther("5");          // +5 NVDA long (negative = short)
const price = ethers.parseEther("140");       // limit price in USD
const orderType = 0;                          // 0 = Limit
const deadline = deadlineAfter(10_000_000n); // include in batches within the next ~10 seconds
const ttl = 60n * 1_000_000n;

const tx = await orderbook.submitOrder(
  nvdaPerpId, size, price, orderType, deadline, ttl,
  0,        // flags — REDUCE_ONLY to only close, POST_ONLY to guarantee you add liquidity
);
console.log("Perp order tx:", tx.hash);
```
{% endtab %}

{% tab title="Rust (alloy)" %}
```rust
use alloy::providers::ProviderBuilder;
use alloy::signers::local::PrivateKeySigner;
use alloy::sol;
use alloy::primitives::{U256, I256, FixedBytes};

sol! {
    #[sol(rpc)]
    contract Orderbook {
        function deposit(address token, address recipient, uint256 amount, uint128 deadline) public;
        enum OrderType { Limit, Market }
        function submitOrder(
            bytes32 orderbookId, int256 size, uint256 price,
            OrderType orderType, uint128 deadline, uint128 ttl,
            uint8 flags
        ) public;
    }
}

// `flags` bits — OR together the ones you want, 0 for a plain resting limit order
const REDUCE_ONLY: u8 = 0x01;
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

// USD is Pod's native token — use the canonical native-token sentinel address
let pusd: Address = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE".parse()?;
let nvda_perp_id = FixedBytes::left_padding_from(&[7]); // NVDA-USD perp (max 20x)
let one_e18 = U256::from(10).pow(U256::from(18));

// Deadlines must be an exact multiple of the market's auction interval
// (500 ms on every testnet market) or validators reject the intent.
const AUCTION_INTERVAL_US: u128 = 500_000;
let now_us = std::time::SystemTime::now()
    .duration_since(std::time::UNIX_EPOCH)?
    .as_micros();
let deadline_after =
    |lag_us: u128| (now_us + lag_us).div_ceil(AUCTION_INTERVAL_US) * AUCTION_INTERVAL_US;

// 1. Deposit USD margin
let margin = U256::from(1000) * one_e18;
orderbook
    .deposit(pusd, signer.address(), margin, deadline_after(60_000_000))
    .send().await?.watch().await?;

// 2. Open a long on NVDA-USD: 5 NVDA at $140 limit
let size = I256::from_raw(U256::from(5) * one_e18);   // +5 NVDA long
let price = U256::from(140) * one_e18;                // limit price in USD
let deadline = deadline_after(10_000_000); // include in batches within the next ~10 seconds
let ttl = 60 * 1_000_000;

let tx = orderbook
    .submitOrder(
        nvda_perp_id, size, price, Orderbook::OrderType::Limit, deadline, ttl,
        0,            // flags — REDUCE_ONLY to only close, POST_ONLY to guarantee you add liquidity
    )
    .send().await?;
println!("Perp order tx: {:?}", tx.tx_hash());
```
{% endtab %}
{% endtabs %}

## Closing a position

Submit an opposite-sided order with `REDUCE_ONLY` (`0x01`) set in `flags`. Reduce-only orders can only decrease your existing exposure — they will be rejected if matching them would flip your position direction or open a new one.

## Market-making: guarantee that you add liquidity

Set `POST_ONLY` (`0x04`) in `flags` to quote as a guaranteed maker. The order rests on the book as usual, but it may not trade in the batch that admitted it: if it would have taken liquidity in that batch, it is removed instead and reported with the terminal status `post_only_refused`. From the next batch onwards it matches like any other resting order.

```typescript
// A post-only, reduce-only quote: it can only add liquidity, and only close exposure
const tx = await orderbook.submitOrder(
  nvdaPerpId, size, price, orderType, deadline, ttl,
  POST_ONLY | REDUCE_ONLY,
);
```

`POST_ONLY` cannot be combined with `IOC`, and cannot be set on a market order — both are rejected. It also cannot be requested on a TP/SL trigger, since `submitTrigger` has no `flags` argument. See [Post-only orders](../applications-precompiles/orderbook.md#post-only-orders) for the exact rules, including what happens when two post-only orders cross each other and how amendments re-arm the guarantee.

{% hint style="info" %}
**Market leverage.** Each perp market has a fixed `maxLeverage` set at creation (20x on every testnet perp). It determines the margin required per position — there's no per-order leverage to set.
{% endhint %}
