# Place an order

This guide walks through placing limit orders on Pod's native markets. The same `submitOrder` call is used for both spot and perpetual markets — the market type is determined by the `orderbookId`. For background, see [Orderbook](https://docs.v2.pod.network/documentation/markets/orderbook) and [Perpetuals](https://docs.v2.pod.network/documentation/markets/perpetuals).

## Spot

Deposit the quote token (pUSD), then submit a limit order. For spot, pass `leverage = 1e18` (1x), `reduceOnly = false`, and `ioc = false` for a resting limit order.

The example below trades the NVDAx-USD spot market — see [Market Configurations](https://docs.v2.pod.network/documentation/markets/market-configurations) for the full live list.

### Steps

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

// pUSD is the native token; NVDAx is the synthetic Nvidia base
const PUSD = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const orderbookId = "0x0000000000000000000000000000000000000000000000000000000000000001"; // NVDAx-USD spot
const now = BigInt(Date.now()) * 1000n; // microseconds

// 1. Deposit pUSD (the quote token) into the orderbook
const depositAmount = ethers.parseEther("1000");
await (await orderbook.deposit(PUSD, wallet.address, depositAmount, now + 60_000_000n)).wait();

// 2. Submit a buy limit order: 1 NVDAx at 200 pUSD
const size = ethers.parseEther("1");         // buy 1 NVDAx (positive = buy)
const price = ethers.parseEther("200");      // limit price in pUSD
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

// pUSD is the native token; NVDAx is the synthetic Nvidia base
let pusd: Address = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE".parse()?;
let orderbook_id = FixedBytes::left_padding_from(&[1]); // NVDAx-USD spot
let now_us = std::time::SystemTime::now()
    .duration_since(std::time::UNIX_EPOCH)?
    .as_micros() as u128;

// 1. Deposit pUSD (the quote token) into the orderbook
let one_e18 = U256::from(10).pow(U256::from(18));
let deposit_amount = U256::from(1000) * one_e18;
orderbook
    .deposit(pusd, signer.address(), deposit_amount, now_us + 60_000_000)
    .send().await?.watch().await?;

// 2. Submit a buy limit order: 1 NVDAx at 200 pUSD
let size = I256::from_raw(one_e18); // buy 1 NVDAx
let price = U256::from(200) * one_e18; // limit price in pUSD
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

## Perpetual

Perpetual markets are quoted in **pUSD** and use cross-margin: a single pUSD deposit serves as collateral for all open perp positions on the account. `size` is the order quantity in **base-asset units** and is signed — positive opens a long, negative opens a short. `leverage` is 1e18-scaled and must fall in `[1e18, maxLeverage × 1e18]`; orders outside that range are rejected.

### Steps

1. Deposit pUSD as margin into the orderbook contract.
2. Submit a leveraged limit order for the perp market (e.g. BTC-USD).

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

// pUSD is Pod's native token — use the canonical native-token sentinel address
const PUSD = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const btcPerpId = "0x0000000000000000000000000000000000000000000000000000000000000007"; // BTC-USD perp (max 10x)
const now = BigInt(Date.now()) * 1000n; // microseconds

// 1. Deposit pUSD margin
const margin = ethers.parseEther("1000"); // 1,000 pUSD
await (await orderbook.deposit(PUSD, wallet.address, margin, now + 60_000_000n)).wait();

// 2. Open a 5x long on BTC-USD: 0.01 BTC notional at $90,000 limit
const size = ethers.parseEther("0.01");       // +0.01 BTC long (negative = short)
const price = ethers.parseEther("90000");     // limit price in pUSD
const orderType = 0;                          // 0 = Limit
const deadline = now + 10_000_000n;
const ttl = 60n * 1_000_000n;
const leverage = ethers.parseEther("5");      // 5e18 = 5x leverage (BTC-USD caps at 10x)

const tx = await orderbook.submitOrder(
  btcPerpId, size, price, orderType, deadline, ttl,
  false,    // reduceOnly — set true to only close existing positions
  false,    // ioc
  leverage,
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

// pUSD is Pod's native token — use the canonical native-token sentinel address
let pusd: Address = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE".parse()?;
let btc_perp_id = FixedBytes::left_padding_from(&[7]); // BTC-USD perp (max 10x)
let now_us = std::time::SystemTime::now()
    .duration_since(std::time::UNIX_EPOCH)?
    .as_micros() as u128;
let one_e18 = U256::from(10).pow(U256::from(18));

// 1. Deposit pUSD margin
let margin = U256::from(1000) * one_e18;
orderbook
    .deposit(pusd, signer.address(), margin, now_us + 60_000_000)
    .send().await?.watch().await?;

// 2. Open a 5x long on BTC-USD: 0.01 BTC notional at $90,000 limit
let size = I256::from_raw(one_e18 / U256::from(100)); // +0.01 BTC long
let price = U256::from(90_000) * one_e18;             // limit price in pUSD
let deadline = now_us + 10_000_000;
let ttl = 60 * 1_000_000;
let leverage = U256::from(5) * one_e18;               // 5x (BTC-USD caps at 10x)

let tx = orderbook
    .submitOrder(
        btc_perp_id, size, price, Orderbook::OrderType::Limit, deadline, ttl,
        false,        // reduceOnly — set true to only close existing positions
        false,        // ioc
        leverage,
    )
    .send().await?;
println!("Perp order tx: {:?}", tx.tx_hash());
```
{% endtab %}
{% endtabs %}

### Closing a position

Submit an opposite-sided order with `reduceOnly = true`. Reduce-only orders can only decrease your existing exposure — they will be rejected if matching them would flip your position direction or open a new one.

{% hint style="info" %}
**Leverage caps.** Each perp market has a `maxLeverage` set at creation (10x for BTC-USD). Submitting an order with a higher `leverage` will be rejected.
{% endhint %}

{% hint style="warning" %}
**Microseconds, not milliseconds.** Deadlines and TTLs are Unix timestamps in microseconds.
{% endhint %}
