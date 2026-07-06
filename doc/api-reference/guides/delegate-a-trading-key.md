# Delegate a trading key

This guide shows how a **master** account authorizes a secondary **delegate** key with one off-chain signature, and how the delegate then submits orderbook calls on the master's behalf using the `delegated` envelope. For background on ownership, expiry, and the security model, see [Key Delegation](../../protocol/key-delegation.md); for the envelope's ABI and constraints, see [Delegation envelope](../applications-precompiles/orderbook.md#delegation-envelope) in the Orderbook precompile reference.

The master signs a single EIP-712 `DelegationAuth { delegate, validUntil }` message — never a Pod transaction. The resulting 65-byte signature is the delegation certificate: the delegate attaches it to every delegated transaction and it stays valid until `validUntil`. A delegated intent is accepted only while `validUntil >= deadline` of the wrapped intent (both in **microseconds**).

## Steps

1. The master signs the `DelegationAuth` typed-data message authorizing the delegate (once, off-chain).
2. The delegate ABI-encodes the orderbook call it wants to perform, wraps it in `delegated(master, validUntil, signature, inner)`, and signs the transaction with its own key.

The example authorizes a fresh delegate key for one week, then has the delegate place a 5 NVDA long at $140 owned by the master. The order rests under the master and draws on the master's orderbook balance; the master can cancel it directly with its own key at any time. Delegated calls are gas-exempt, so the delegate key needs no funds.

{% tabs %}
{% tab title="TypeScript (ethers.js)" %}
```typescript
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("https://rpc.podtestnet.dev");
const master = new ethers.Wallet(MASTER_PRIVATE_KEY);
const delegate = new ethers.Wallet(DELEGATE_PRIVATE_KEY, provider); // fresh app-generated key
const { chainId } = await provider.getNetwork();

const now = BigInt(Date.now()) * 1000n; // microseconds

// 1. Master signs the delegation certificate (once, off-chain) — valid for one week.
const validUntil = now + 7n * 24n * 3600n * 1_000_000n;
const signature = await master.signTypedData(
  { name: "pod delegation", version: "1", chainId },
  {
    DelegationAuth: [
      { name: "delegate", type: "address" },
      { name: "validUntil", type: "uint64" },
    ],
  },
  { delegate: delegate.address, validUntil },
);

// 2. Delegate wraps an order in delegated(...) and submits it with its own key.
const ORDERBOOK = "0x50d0000000000000000000000000000000000002";
const abi = [
  "function submitOrder(bytes32 orderbookId, int256 size, uint256 price, uint8 orderType, uint128 deadline, uint128 ttl, bool reduceOnly, bool ioc)",
  "function delegated(address master, uint64 validUntil, bytes signature, bytes inner)",
];
const orderbook = new ethers.Contract(ORDERBOOK, abi, delegate);

const nvdaPerpId = "0x0000000000000000000000000000000000000000000000000000000000000007"; // NVDA-USD perp
const deadline = now + 10_000_000n; // must be <= validUntil
const ttl = 60n * 1_000_000n;

// 5 NVDA long at $140 limit, owned by the master
const inner = orderbook.interface.encodeFunctionData("submitOrder", [
  nvdaPerpId, ethers.parseEther("5"), ethers.parseEther("140"),
  0 /* Limit */, deadline, ttl, false, false,
]);

const tx = await orderbook.delegated(master.address, validUntil, signature, inner);
console.log("Delegated order tx:", tx.hash);
```
{% endtab %}

{% tab title="Rust (alloy)" %}
```rust
use alloy::primitives::{FixedBytes, I256, U256};
use alloy::providers::{Provider, ProviderBuilder};
use alloy::signers::{Signer, local::PrivateKeySigner};
use alloy::sol;
use alloy::sol_types::{SolCall, eip712_domain};

sol! {
    /// The message the master signs to authorize a delegate.
    struct DelegationAuth {
        address delegate;
        uint64 validUntil;
    }

    #[sol(rpc)]
    contract Orderbook {
        enum OrderType { Limit, Market }
        function submitOrder(
            bytes32 orderbookId, int256 size, uint256 price,
            OrderType orderType, uint128 deadline, uint128 ttl,
            bool reduceOnly, bool ioc
        ) public;
        function delegated(address master, uint64 validUntil, bytes signature, bytes inner) public;
    }
}

let master: PrivateKeySigner = MASTER_PRIVATE_KEY.parse()?;
let delegate: PrivateKeySigner = DELEGATE_PRIVATE_KEY.parse()?; // fresh app-generated key

let provider = ProviderBuilder::new()
    .wallet(delegate.clone())
    .on_http("https://rpc.podtestnet.dev".parse()?);
let chain_id = provider.get_chain_id().await?;

let now_us = std::time::SystemTime::now()
    .duration_since(std::time::UNIX_EPOCH)?
    .as_micros() as u64; // microseconds

// 1. Master signs the delegation certificate (once, off-chain) — valid for one week.
let valid_until = now_us + 7 * 24 * 3600 * 1_000_000;
let domain = eip712_domain! {
    name: "pod delegation",
    version: "1",
    chain_id: chain_id,
};
let auth = DelegationAuth { delegate: delegate.address(), validUntil: valid_until };
let signature = master.sign_typed_data(&auth, &domain).await?;

// 2. Delegate wraps an order in delegated(...) and submits it with its own key.
let orderbook = Orderbook::new(
    "0x50d0000000000000000000000000000000000002".parse()?,
    &provider,
);

let nvda_perp_id = FixedBytes::left_padding_from(&[7]); // NVDA-USD perp
let one_e18 = U256::from(10).pow(U256::from(18));
let deadline = u128::from(now_us) + 10_000_000; // must be <= valid_until
let ttl = 60 * 1_000_000;

// 5 NVDA long at $140 limit, owned by the master
let inner = Orderbook::submitOrderCall {
    orderbookId: nvda_perp_id,
    size: I256::from_raw(U256::from(5) * one_e18),
    price: U256::from(140) * one_e18,
    orderType: Orderbook::OrderType::Limit,
    deadline, ttl, reduceOnly: false, ioc: false,
}.abi_encode();

let tx = orderbook
    .delegated(master.address(), valid_until, signature.as_bytes().into(), inner.into())
    .send().await?;
println!("Delegated order tx: {:?}", tx.tx_hash());
```
{% endtab %}
{% endtabs %}

## Notes

* **Reuse the certificate.** Step 1 runs once; the delegate reuses the same `signature` and `validUntil` on every delegated call until expiry. Any single-intent call (`submitOrder`, `cancel`, `update`, triggers, `deposit`, `withdraw`) or a whole `submitBatch` can be wrapped the same way — see [What can be delegated](../../protocol/key-delegation.md#what-can-be-delegated).
* **Deadlines.** The usual orderbook rules apply to the inner call unchanged (microsecond timestamps, `deadline` aligned to the market's `auction_interval` — see the [Orderbook precompile reference](../applications-precompiles/orderbook.md)), plus one more: the certificate must satisfy `validUntil >= deadline`.
* **Funds stay with the master.** A delegated `deposit` or `withdraw` has its `recipient` overridden to the master, so the delegate can never direct funds elsewhere.
* **Rotation.** There is no on-chain revocation — to replace a delegate, stop using the old key and sign a new `DelegationAuth` for a new one. Keep `validUntil` short.
