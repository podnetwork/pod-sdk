# Place a spot order

This guide walks through placing a limit order on one of Pod's spot markets. For background, see [Orderbook](https://docs.v2.pod.network/documentation/markets/orderbook).

Spot orders use the same `submitOrder` call as perpetual orders. For spot, pass `leverage = 1e18` (1x), `reduceOnly = false`, and `ioc = false` for a resting limit order. Deposit the quote token (USD) before submitting.

The example below trades the NVDAx-USD spot market — see [Market Configurations](../market-configurations.md) for the full live list.

## Steps

1. Deposit the quote token into the orderbook contract.
2. Submit a limit order with price, size, deadline, and TTL.

{% tabs %}
{% tab title="TypeScript (ethers.js)" %}
```typescript
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("https://rpc.v1.dev.pod.network");
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const ORDERBOOK = "0x50d0000000000000000000000000000000000002";
const abi = [
  "function deposit(address token, address recipient, uint256 amount, uint128 deadline)",
  "function submitOrder(bytes32 orderbookId, int256 size, uint256 price, uint8 orderType, uint128 deadline, uint128 ttl, bool reduceOnly, bool ioc, uint256 leverage)",
];
const orderbook = new ethers.Contract(ORDERBOOK, abi, wallet);

// USD is the native token; NVDAx is the synthetic Nvidia base
const USD = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const orderbookId = "0x0000000000000000000000000000000000000000000000000000000000000001"; // NVDAx-USD spot
const now = BigInt(Date.now()) * 1000n; // microseconds

// 1. Deposit USD (the quote token) into the orderbook
const depositAmount = ethers.parseEther("1000");
await (await orderbook.deposit(USD, wallet.address, depositAmount, now + 60_000_000n)).wait();

// 2. Submit a buy limit order: 1 NVDAx at 200 USD
const size = ethers.parseEther("1");         // buy 1 NVDAx (positive = buy)
const price = ethers.parseEther("200");      // limit price in USD
const orderType = 0;                         // 0 = Limit, 1 = Market
const deadline = now + 10_000_000n;          // include in batches within next 10 seconds
const ttl = 60n * 1_000_000n;               // order lives for 60 seconds
const leverage = ethers.parseEther("1");     // 1e18 = 1x (spot)

const tx = await orderbook.submitOrder(
  orderbookId, size, price, orderType, deadline, ttl,
  false,    // reduceOnly (perp only)
  false,    // ioc — immediate-or-cancel
  leverage,
);
console.log("Order tx:", tx.hash);
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
            bool reduceOnly, bool ioc, uint256 leverage
        ) public;
    }
}

let signer: PrivateKeySigner = PRIVATE_KEY.parse()?;
let provider = ProviderBuilder::new()
    .wallet(signer.clone())
    .on_http("https://rpc.v1.dev.pod.network".parse()?);

let orderbook = Orderbook::new(
    "0x50d0000000000000000000000000000000000002".parse()?,
    &provider,
);

// USD is the native token; NVDAx is the synthetic Nvidia base
let pusd: Address = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE".parse()?;
let orderbook_id = FixedBytes::left_padding_from(&[1]); // NVDAx-USD spot
let now_us = std::time::SystemTime::now()
    .duration_since(std::time::UNIX_EPOCH)?
    .as_micros() as u128;

// 1. Deposit USD (the quote token) into the orderbook
let one_e18 = U256::from(10).pow(U256::from(18));
let deposit_amount = U256::from(1000) * one_e18;
orderbook
    .deposit(pusd, signer.address(), deposit_amount, now_us + 60_000_000)
    .send().await?.watch().await?;

// 2. Submit a buy limit order: 1 NVDAx at 200 USD
let size = I256::from_raw(one_e18); // buy 1 NVDAx
let price = U256::from(200) * one_e18; // limit price in USD
let deadline = now_us + 10_000_000; // include in batches within next 10 seconds
let ttl = 60 * 1_000_000; // order lives for 60 seconds

let tx = orderbook
    .submitOrder(
        orderbook_id, size, price, Orderbook::OrderType::Limit, deadline, ttl,
        false,        // reduceOnly (perp only)
        false,        // ioc — immediate-or-cancel
        one_e18,      // leverage: 1e18 = 1x (spot)
    )
    .send().await?;
println!("Order tx: {:?}", tx.tx_hash());
```
{% endtab %}
{% endtabs %}

{% hint style="warning" %}
**Microseconds, not milliseconds.** Deadlines and TTLs are Unix timestamps in microseconds.
{% endhint %}
