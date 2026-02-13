# Place an order

This guide walks through placing a limit order on Pod's orderbook. For background on how the orderbook and matching work, see [Orderbook](../../protocol/markets-architecture/orderbook.md) and [Batch Auctions](../../protocol/markets-architecture/batch-auctions.md).

## Steps

1. Deposit tokens into the orderbook contract.
2. Submit a limit order with price, volume, deadline, and TTL.

{% tabs %}
{% tab title="TypeScript (ethers.js)" %}
```typescript
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("https://rpc.v1.dev.pod.network");
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const ORDERBOOK = "0x000000000000000000000000000000000000C10B";
const abi = [
  "function deposit(address token, address recipient, uint256 amount, uint128 deadline)",
  "function submitOrder(bytes32 orderbookId, int256 volume, uint256 price, uint128 deadline, uint128 ttl, bool reduceOnly)",
];
const orderbook = new ethers.Contract(ORDERBOOK, abi, wallet);

const USDT = "0x0000000000000000000000000000000000000001";
const orderbookId = "0x0000000000000000000000000000000000000000000000000000000000000001";
const now = BigInt(Date.now()) * 1000n; // microseconds

// 1. Deposit tokens into the orderbook
const depositAmount = ethers.parseEther("1000");
await (await orderbook.deposit(USDT, wallet.address, depositAmount, now + 60_000_000n)).wait();

// 2. Submit a buy limit order
const volume = ethers.parseEther("1");       // buy 1 unit (positive = buy)
const price = ethers.parseEther("5000");     // limit price
const deadline = now + 10_000_000n;          // include in batches within next 10 seconds
const ttl = 60n * 1_000_000n;               // order lives for 60 seconds

const tx = await orderbook.submitOrder(orderbookId, volume, price, deadline, ttl, false);
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
        function submitOrder(
            bytes32 orderbookId, int256 volume, uint256 price,
            uint128 deadline, uint128 ttl, bool reduceOnly
        ) public;
    }
}

let signer: PrivateKeySigner = PRIVATE_KEY.parse()?;
let provider = ProviderBuilder::new()
    .wallet(signer.clone())
    .on_http("https://rpc.v1.dev.pod.network".parse()?);

let orderbook = Orderbook::new(
    "0x000000000000000000000000000000000000C10B".parse()?,
    &provider,
);

let usdt: Address = "0x0000000000000000000000000000000000000001".parse()?;
let orderbook_id = FixedBytes::left_padding_from(&[1]);
let now_us = std::time::SystemTime::now()
    .duration_since(std::time::UNIX_EPOCH)?
    .as_micros() as u128;

// 1. Deposit tokens into the orderbook
let deposit_amount = U256::from(1000) * U256::from(10).pow(U256::from(18));
orderbook
    .deposit(usdt, signer.address(), deposit_amount, now_us + 60_000_000)
    .send().await?.watch().await?;

// 2. Submit a buy limit order
let volume = I256::from_raw(U256::from(10).pow(U256::from(18))); // buy 1 unit
let price = U256::from(5000) * U256::from(10).pow(U256::from(18)); // limit price
let deadline = now_us + 10_000_000; // include in batches within next 10 seconds
let ttl = 60 * 1_000_000; // order lives for 60 seconds

let tx = orderbook
    .submitOrder(orderbook_id, volume, price, deadline, ttl, false)
    .send().await?;
println!("Order tx: {:?}", tx.tx_hash());
```
{% endtab %}
{% endtabs %}

{% hint style="warning" %}
**Microseconds, not milliseconds.** Deadlines and TTLs are Unix timestamps in microseconds.
{% endhint %}
