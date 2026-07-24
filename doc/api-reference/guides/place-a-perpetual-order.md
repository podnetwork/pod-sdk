# Place a perpetual order

This guide walks through opening a leveraged perpetual position on one of Pod's perp markets. For background, see [Perpetuals](https://docs.v2.pod.network/documentation/markets/perpetuals) and [Market Configurations](../market-configurations.md) for the live perp market list.

Perpetual markets are quoted in **USD** and use cross-margin: a single USD deposit serves as collateral for all open perp positions on the account. `size` is the order quantity in **base-asset units** and is signed — positive opens a long, negative opens a short. Margin is computed by the market from `|size| × price / maxLeverage`.

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
  "function submitOrder(bytes32 orderbookId, int256 size, uint256 price, uint8 orderType, uint128 deadline, uint128 ttl, bool reduceOnly, bool ioc)",
];
const orderbook = new ethers.Contract(ORDERBOOK, abi, wallet);

// USD is Pod's native token — use the canonical native-token sentinel address
const USD = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const nvdaPerpId = "0x0000000000000000000000000000000000000000000000000000000000000007"; // NVDA-USD perp (max 20x)
const now = BigInt(Date.now()) * 1000n; // microseconds

// 1. Deposit USD margin
const margin = ethers.parseEther("1000"); // 1,000 USD
await (await orderbook.deposit(USD, wallet.address, margin, now + 60_000_000n)).wait();

// 2. Open a long on NVDA-USD: 5 NVDA at $140 limit
const size = ethers.parseEther("5");          // +5 NVDA long (negative = short)
const price = ethers.parseEther("140");       // limit price in USD
const orderType = 0;                          // 0 = Limit
const deadline = now + 10_000_000n;
const ttl = 60n * 1_000_000n;

const tx = await orderbook.submitOrder(
  nvdaPerpId, size, price, orderType, deadline, ttl,
  false,    // reduceOnly — set true to only close existing positions
  false,    // ioc
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
            bool reduceOnly, bool ioc
        ) public;
    }
}

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
let now_us = std::time::SystemTime::now()
    .duration_since(std::time::UNIX_EPOCH)?
    .as_micros() as u128;
let one_e18 = U256::from(10).pow(U256::from(18));

// 1. Deposit USD margin
let margin = U256::from(1000) * one_e18;
orderbook
    .deposit(pusd, signer.address(), margin, now_us + 60_000_000)
    .send().await?.watch().await?;

// 2. Open a long on NVDA-USD: 5 NVDA at $140 limit
let size = I256::from_raw(U256::from(5) * one_e18);   // +5 NVDA long
let price = U256::from(140) * one_e18;                // limit price in USD
let deadline = now_us + 10_000_000;
let ttl = 60 * 1_000_000;

let tx = orderbook
    .submitOrder(
        nvda_perp_id, size, price, Orderbook::OrderType::Limit, deadline, ttl,
        false,        // reduceOnly — set true to only close existing positions
        false,        // ioc
    )
    .send().await?;
println!("Perp order tx: {:?}", tx.tx_hash());
```
{% endtab %}
{% endtabs %}

## Closing a position

Submit an opposite-sided order with `reduceOnly = true`. Reduce-only orders can only decrease your existing exposure — they will be rejected if matching them would flip your position direction or open a new one.

{% hint style="info" %}
**Market leverage.** Each perp market has a fixed `maxLeverage` set at creation (20x on every testnet perp). It determines the margin required per position — there's no per-order leverage to set.
{% endhint %}
