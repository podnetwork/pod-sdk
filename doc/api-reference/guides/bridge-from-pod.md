# Bridge from Pod

This guide walks through moving tokens off Pod: `withdraw` on the bridge precompile debits your balance, burns it on Pod, and makes the same value claimable on the bridged chain. For background on how the bridge works, see [Native Bridge](https://docs.v2.pod.network/documentation/native-bridge); for the full call reference, see the [Bridge precompile](../applications-precompiles/bridge.md).

## Before you start

Read `GET /v1/bridge/config` on any full node. It names the bridged chain, the contract the claim is submitted to, and the per-token rules — there is no `chainId` parameter to pass, and this list is the only source of the Pod-token → bridged-chain-token mapping:

```json
{
  "claim_chain_id": 42161,
  "source_contract": "0x…",
  "version": 1,
  "tokens": [
    { "pod_token": "0x…", "l1_token": "0x…", "decimals": 6, "min": "0xf4240", "max": "0x…" }
  ]
}
```

## Amounts and decimals

`amount` is in **Pod's 18 decimals** — the units the balance is denominated in — and must be a **whole number of bridged-chain units**: `amount % 10^(18 - decimals) == 0`. For a 6-decimal token like USDC that means a multiple of `1e12` wei. Nothing is rounded for you; an inexact amount is rejected before attestation.

`min` and `max` from `/v1/bridge/config` are in the token's **bridged-chain** decimals and are compared against the converted amount, not the 18-decimal one you sign.

{% hint style="warning" %}
**`tx.value` must be `0`, native token included.** The balance is debited internally, so nothing rides along with the transaction. Withdrawals are also gas-exempt, so an account funded entirely over the bridge can withdraw all of it without keeping anything back for fees.
{% endhint %}

## Steps

1. Call `withdraw(token, to, amount, deadline)` on the Pod bridge precompile. `to` is an address on the **bridged chain**, and `deadline` is an auction-aligned batch deadline in microseconds, exactly like an order's.
2. Poll `GET /v1/bridge/withdrawals/by-id/{txHash}` — keyed by the withdraw transaction's own hash — until a `proof` appears. The route 404s until the withdrawal executes, a tick after admission. `pending` means the certificate is still assembling; `refused` means nothing was debited.
3. Call `claim(token, amount, to, proof, auxTxSuffix)` on the bridged chain's bridge contract. Take `amount` and `to` **from the proof response** — that amount is in the bridged chain's decimals, not the 18-decimal value you signed. Do **not** take `token` from it: the proof reports the Pod-side address, and `claim` needs the bridged-chain one, which is `l1_token` in `/v1/bridge/config`.

The bridge relayer performs step 3 for you. The call is permissionless, so submit it yourself only if the relayer is unavailable.

## Examples for withdrawing 100 USDC from Pod (6 decimals on the bridged chain)

{% tabs %}
{% tab title="TypeScript (ethers.js)" %}
```typescript
import { ethers } from "ethers";

const podProvider = new ethers.JsonRpcProvider("https://rpc.podtestnet.dev");
const claimProvider = new ethers.JsonRpcProvider(CLAIM_CHAIN_RPC); // the chain /v1/bridge/config names
const podWallet = new ethers.Wallet(PRIVATE_KEY, podProvider);
const claimWallet = new ethers.Wallet(PRIVATE_KEY, claimProvider);

const POD_BRIDGE = "0x50d0000000000000000000000000000000000001";
const POD_RPC_REST = "https://rpc.podtestnet.dev/v1";
const POD_TOKEN = "POD_TOKEN_ADDRESS"; // 0xEeee…EEeE for the native token

// From GET /v1/bridge/config — the bridged chain, its bridge contract, and the
// Pod-token -> bridged-chain-token mapping all come from here.
const config = await (await fetch(`${POD_RPC_REST}/bridge/config`)).json();
const token = config.tokens.find((t) => t.pod_token.toLowerCase() === POD_TOKEN.toLowerCase());

// Amounts are in Pod's 18 decimals and must be a whole number of bridged-chain
// units — 100 USDC is 100e18 wei here, which is a clean multiple of 1e12.
const amount = ethers.parseEther("100");
const granularity = 10n ** BigInt(18 - token.decimals);
if (amount % granularity !== 0n) throw new Error("amount is not a whole number of bridged-chain units");

// Deadlines must be an exact multiple of the auction interval
// (500 ms on every testnet market) or validators reject the intent.
const AUCTION_INTERVAL = 500_000n; // microseconds
const deadlineAfter = (lagUs: bigint): bigint =>
  ((BigInt(Date.now()) * 1000n + lagUs + AUCTION_INTERVAL - 1n) / AUCTION_INTERVAL) * AUCTION_INTERVAL;

// 1. Withdraw. tx.value is 0 for every token, native included.
const bridge = new ethers.Contract(
  POD_BRIDGE,
  ["function withdraw(address token, address to, uint256 amount, uint128 deadline)"],
  podWallet
);
const withdrawTx = await bridge.withdraw(
  POD_TOKEN,
  claimWallet.address,       // recipient on the CLAIM CHAIN, not on Pod
  amount,
  deadlineAfter(60_000_000n)
);
const receipt = await withdrawTx.wait();

// 2. Poll for the claim proof, keyed by the withdraw tx hash. The route 404s
// until the withdrawal executes (a tick after admission), so treat a non-200 as
// "not yet". Branch on the presence of `proof`, not on `status`: a status a
// client does not recognise must never veto a certificate in the same response,
// and must mean "retry" rather than "failed".
let detail;
for (;;) {
  const res = await fetch(`${POD_RPC_REST}/bridge/withdrawals/by-id/${receipt.hash}`);
  if (res.ok) {
    detail = await res.json();
    if (detail.proof) break;
    if (detail.status === "refused") throw new Error(`refused: ${detail.withdrawal.error}`);
  }
  await new Promise((r) => setTimeout(r, 1000)); // 404, "pending", or anything unfamiliar
}

// 3. Claim. `amount` and `to` come from the proof — that amount is in the claim
// chain's decimals (100e6 here), NOT the 18-decimal value you signed. `token`
// does NOT: the proof reports the Pod-side address, so map it via l1_token.
// `proof` and `aux_tx_suffix` arrive as arrays of byte values, not hex strings.
const claimBridge = new ethers.Contract(
  config.source_contract,
  ["function claim(address token, uint256 amount, address to, bytes proof, bytes auxTxSuffix)"],
  claimWallet
);
await (await claimBridge.claim(
  token.l1_token,
  detail.proof.amount,
  detail.proof.to,
  new Uint8Array(detail.proof.proof),
  new Uint8Array(detail.proof.aux_tx_suffix)
)).wait();
```
{% endtab %}

{% tab title="Rust (alloy)" %}
```rust
use alloy::primitives::U256;
use alloy::providers::{Provider, ProviderBuilder};
use alloy::signers::local::PrivateKeySigner;
use alloy::sol;

sol! {
    #[sol(rpc)]
    contract PodBridge {
        function withdraw(address token, address to, uint256 amount, uint128 deadline) public;
    }

    #[sol(rpc)]
    contract ClaimBridge {
        function claim(
            address token, uint256 amount, address to, bytes proof, bytes auxTxSuffix
        ) public;
    }
}

let signer: PrivateKeySigner = PRIVATE_KEY.parse()?;

let pod_provider = ProviderBuilder::new()
    .wallet(signer.clone())
    .on_http("https://rpc.podtestnet.dev".parse()?);

let claim_provider = ProviderBuilder::new()
    .wallet(signer.clone())
    .on_http(CLAIM_CHAIN_RPC.parse()?); // the chain /v1/bridge/config names

let pod_token = "POD_TOKEN_ADDRESS".parse()?; // 0xEeee…EEeE for the native token
let claim_decimals = 6u32;                    // token.decimals from /v1/bridge/config

// Pod's 18 decimals, and a whole number of bridged-chain units.
let amount = U256::from(100u64) * U256::from(10u64).pow(U256::from(18));
let granularity = U256::from(10u64).pow(U256::from(18 - claim_decimals));
assert!(amount % granularity == U256::ZERO, "not a whole number of bridged-chain units");

// Deadlines must be an exact multiple of the auction interval
// (500 ms on every testnet market) or validators reject the intent.
const AUCTION_INTERVAL_US: u128 = 500_000;
let now_us = std::time::SystemTime::now()
    .duration_since(std::time::UNIX_EPOCH)?
    .as_micros();
let deadline_after =
    |lag_us: u128| (now_us + lag_us).div_ceil(AUCTION_INTERVAL_US) * AUCTION_INTERVAL_US;

// 1. Withdraw. No chain id, and no value — the balance is debited
// internally. `deadline` is an auction-aligned batch deadline in microseconds.
let pod_bridge = PodBridge::new(
    "0x50d0000000000000000000000000000000000001".parse()?,
    &pod_provider,
);
let withdraw_receipt = pod_bridge
    .withdraw(pod_token, signer.address(), amount, deadline_after(60_000_000))
    .send().await?
    .get_receipt().await?;

// 2. Poll for the claim proof by the withdraw tx hash. The withdrawal settles a
// tick after admission, so the first attempts legitimately come back empty.
let claim_proof = loop {
    let got: Option<serde_json::Value> = pod_provider
        .raw_request(
            "pod_getBridgeClaimProof".into(),
            vec![withdraw_receipt.transaction_hash],
        )
        .await
        .ok();
    if let Some(p) = got.filter(|p| !p["proof"].is_null()) {
        break p;
    }
    tokio::time::sleep(std::time::Duration::from_secs(1)).await;
};

// 3. Claim. `amount` and `to` come from the proof: that amount is in the claim
// chain's decimals (100e6 here), not the 18-decimal value that was signed.
// `token` does NOT come from the proof — that field is the Pod-side address, so
// map it through `l1_token` in /v1/bridge/config. `proof` and `aux_tx_suffix`
// are byte arrays in JSON, not hex strings.
let bytes = |v: &serde_json::Value| -> Vec<u8> { serde_json::from_value(v.clone()).unwrap() };
let claim_bridge = ClaimBridge::new("CLAIM_CHAIN_BRIDGE_ADDRESS".parse()?, &claim_provider);
claim_bridge
    .claim(
        "CLAIM_CHAIN_TOKEN_ADDRESS".parse()?, // l1_token from /v1/bridge/config
        claim_proof["amount"].as_str().unwrap().parse()?,
        claim_proof["to"].as_str().unwrap().parse()?,
        bytes(&claim_proof["proof"]).into(),
        bytes(&claim_proof["aux_tx_suffix"]).into(),
    )
    .send().await?
    .watch().await?;
```
{% endtab %}
{% endtabs %}

## If the withdrawal is refused

Admission deliberately does **not** check your balance — pending fills can raise it before the batch executes — so a shortfall arrives as an outcome, not as a rejected transaction. Watch `eth_subscribe("pod_withdrawals", { account })`, or read `error` from the REST detail:

* `insufficient_balance` — the balance did not cover the amount when the batch executed.
* `not_included` — the solver left the intent out of the solution its deadline pointed at.

Both mean **nothing was debited** and no claim will ever exist. The nonce is spent, so retrying means a new transaction with a new hash. A client watching only the bridged chain would wait forever for an event that cannot come.

A `refused` status can also arrive with **no** `error` at all — a node whose bridge config does not cover the token records the row and signs nothing. Treat `refused` as terminal on the status alone, without requiring a reason.

{% hint style="info" %}
Anyone can submit the claim transaction — it does not need to come from the account that withdrew.
{% endhint %}
