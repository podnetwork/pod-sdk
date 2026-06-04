# Submit a batch order

This guide shows how to send several intents in a single signed transaction using the orderbook's `submitBatch` envelope. A common use is to place an entry order together with its take-profit and stop-loss triggers atomically, so they all target the same auction tick.

For the envelope's rules and constraints, see [Batch envelope](../applications-precompiles/orderbook.md#batch-envelope) in the Orderbook precompile reference. See the [Orderbook precompile reference](../applications-precompiles/orderbook.md) for the timestamp unit, deadline-alignment, and TTL rules that apply to every call below.

Each entry in `inner` is the full ABI-encoded calldata of a single-intent call (`submitOrder`, `submitTrigger`, etc.), and **every sub-intent must carry the same `deadline`** so the whole envelope lands in one tick.

## Steps

1. ABI-encode each single-intent call (entry order, take-profit trigger, stop-loss trigger).
2. Pass them as the `inner` array to `submitBatch`.

The example opens a 5 NVDA long at $140 and arms two position-grouped, reduce-only triggers — a take-profit that sells at $160 and a stop-loss that sells at $120.

{% tabs %}
{% tab title="TypeScript (ethers.js)" %}
```typescript
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("https://rpc.podtestnet.dev");
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const ORDERBOOK = "0x50d0000000000000000000000000000000000002";
const abi = [
  "function submitOrder(bytes32 orderbookId, int256 size, uint256 price, uint8 orderType, uint128 deadline, uint128 ttl, bool reduceOnly, bool ioc)",
  "function submitTrigger(bytes32 orderbookId, int256 size, uint256 limitPrice, uint256 triggerPrice, uint8 triggerType, uint8 grouping, uint128 deadline, uint128 ttl, bool reduceOnly, bool ioc)",
  "function submitBatch(bytes[] inner)",
];
const orderbook = new ethers.Contract(ORDERBOOK, abi, wallet);

const nvdaPerpId = "0x0000000000000000000000000000000000000000000000000000000000000007"; // NVDA-USD perp
const now = BigInt(Date.now()) * 1000n; // microseconds

// One shared deadline for the whole envelope — required by submitBatch.
const deadline = now + 10_000_000n;
const ttl = 60n * 1_000_000n;
const size = ethers.parseEther("5"); // +5 NVDA long

// 1. Entry: 5 NVDA long at $140 limit
const entry = orderbook.interface.encodeFunctionData("submitOrder", [
  nvdaPerpId, size, ethers.parseEther("140"), 0 /* Limit */, deadline, ttl, false, false,
]);

// 2. Take-profit: sell 5 NVDA when price reaches $160 (reduceOnly, tied to the position)
const takeProfit = orderbook.interface.encodeFunctionData("submitTrigger", [
  nvdaPerpId, -size, ethers.parseEther("160"), ethers.parseEther("160"),
  0 /* TakeProfit */, 1 /* Position */, deadline, ttl, true, false,
]);

// 3. Stop-loss: sell 5 NVDA when price drops to $120 (reduceOnly, tied to the position)
const stopLoss = orderbook.interface.encodeFunctionData("submitTrigger", [
  nvdaPerpId, -size, ethers.parseEther("120"), ethers.parseEther("120"),
  1 /* StopLoss */, 1 /* Position */, deadline, ttl, true, false,
]);

// Submit all three as one atomic envelope
const tx = await orderbook.submitBatch([entry, takeProfit, stopLoss]);
console.log("Batch tx:", tx.hash);
```
{% endtab %}

{% tab title="Rust (alloy)" %}
```rust
use alloy::providers::ProviderBuilder;
use alloy::signers::local::PrivateKeySigner;
use alloy::sol;
use alloy::sol_types::SolCall;
use alloy::primitives::{U256, I256, FixedBytes};

sol! {
    #[sol(rpc)]
    contract Orderbook {
        enum OrderType { Limit, Market }
        enum TriggerType { TakeProfit, StopLoss }
        enum TriggerGrouping { None, Position }
        function submitOrder(
            bytes32 orderbookId, int256 size, uint256 price,
            OrderType orderType, uint128 deadline, uint128 ttl,
            bool reduceOnly, bool ioc
        ) public;
        function submitTrigger(
            bytes32 orderbookId, int256 size, uint256 limitPrice, uint256 triggerPrice,
            TriggerType triggerType, TriggerGrouping grouping, uint128 deadline, uint128 ttl,
            bool reduceOnly, bool ioc
        ) public;
        function submitBatch(bytes[] inner) public;
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

let nvda_perp_id = FixedBytes::left_padding_from(&[7]); // NVDA-USD perp
let now_us = std::time::SystemTime::now()
    .duration_since(std::time::UNIX_EPOCH)?
    .as_micros() as u128;
let one_e18 = U256::from(10).pow(U256::from(18));

// One shared deadline for the whole envelope — required by submitBatch.
let deadline = now_us + 10_000_000;
let ttl = 60 * 1_000_000;
let size = I256::from_raw(U256::from(5) * one_e18); // +5 NVDA long

// 1. Entry: 5 NVDA long at $140 limit
let entry = Orderbook::submitOrderCall {
    orderbookId: nvda_perp_id,
    size,
    price: U256::from(140) * one_e18,
    orderType: Orderbook::OrderType::Limit,
    deadline, ttl, reduceOnly: false, ioc: false,
}.abi_encode();

// 2. Take-profit: sell 5 NVDA when price reaches $160 (reduceOnly, tied to the position)
let take_profit = Orderbook::submitTriggerCall {
    orderbookId: nvda_perp_id,
    size: -size,
    limitPrice: U256::from(160) * one_e18,
    triggerPrice: U256::from(160) * one_e18,
    triggerType: Orderbook::TriggerType::TakeProfit,
    grouping: Orderbook::TriggerGrouping::Position,
    deadline, ttl, reduceOnly: true, ioc: false,
}.abi_encode();

// 3. Stop-loss: sell 5 NVDA when price drops to $120 (reduceOnly, tied to the position)
let stop_loss = Orderbook::submitTriggerCall {
    orderbookId: nvda_perp_id,
    size: -size,
    limitPrice: U256::from(120) * one_e18,
    triggerPrice: U256::from(120) * one_e18,
    triggerType: Orderbook::TriggerType::StopLoss,
    grouping: Orderbook::TriggerGrouping::Position,
    deadline, ttl, reduceOnly: true, ioc: false,
}.abi_encode();

// Submit all three as one atomic envelope
let tx = orderbook
    .submitBatch(vec![entry.into(), take_profit.into(), stop_loss.into()])
    .send().await?;
println!("Batch tx: {:?}", tx.tx_hash());
```
{% endtab %}
{% endtabs %}
