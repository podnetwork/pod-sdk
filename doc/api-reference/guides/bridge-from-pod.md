# Bridge from Pod

This guide walks through bridging ERC20 tokens from Pod to Ethereum. For background on how the bridge works, see [Native Bridge](https://docs.v2.pod.network/documentation/native-bridge).

A withdrawal debits your **orderbook balance** — the balance bridge deposits credit and trading uses — and settles at the next batch auction. The call is **gas-exempt**, must be signed by the account that owns the funds (delegated session keys cannot withdraw), and `tx.value` must be `0`, native token included.

## Decimal Scaling

All tokens on Pod are represented with 18 decimals. The `withdraw` `amount` is in **Pod's 18 decimals**, and must be a whole multiple of `10^(18 - target_decimals)` — an amount finer than the target chain can represent is rejected rather than truncated. For example, to bridge 1 USDC (6 decimals on Ethereum), pass `1000000000000000000` (1e18).

The Ethereum-side `claim` is denominated in the **Ethereum token's units** (1e6 for 1 USDC); take that amount from the proof response rather than converting yourself.

## Steps

1. Call `withdraw(token, to, amount, deadline)` on the Pod bridge precompile. `to` is the recipient on Ethereum; `deadline` is a microsecond timestamp aligned to the auction interval, computed exactly as for orders (see [Orderbook](../applications-precompiles/orderbook.md)). There is no `chainId` — exactly one chain is claimable.
2. Compute your `withdrawal_id = keccak256(abi.encode(signer, nonce, uint32(0)))`, where `nonce` is the withdraw transaction's nonce.
3. Poll `GET /v1/bridge/withdrawals/by-id/{withdrawal_id}` until `status` is `claimable`; the response then carries the `proof` and the claim-chain `amount`. (`refused` means the balance did not cover it at execution — nothing was debited; resubmit under a new nonce.)
4. Call `claim(token, amount, to, proof, auxTxSuffix)` on the Ethereum bridge contract, with `auxTxSuffix = withdrawal_id`.

{% hint style="info" %}
Networks run a relayer that claims withdrawals on Ethereum automatically, so step 4 usually happens for you — the funds simply arrive at `to`. Claiming yourself is the permissionless fallback; a duplicate claim of the same withdrawal reverts harmlessly.
{% endhint %}

## Examples for bridging 100 tokens (e.g. USDC) from Pod to Ethereum (assuming 6 decimals on Ethereum):

{% tabs %}
{% tab title="TypeScript (ethers.js)" %}
```typescript
import { ethers } from "ethers";

const podProvider = new ethers.JsonRpcProvider("https://rpc.podtestnet.dev");
const ethProvider = new ethers.JsonRpcProvider("https://eth.llamarpc.com");
const podWallet = new ethers.Wallet(PRIVATE_KEY, podProvider);
const ethWallet = new ethers.Wallet(PRIVATE_KEY, ethProvider);

const POD_BRIDGE = "0x50d0000000000000000000000000000000000001";
const ETH_BRIDGE = "ETHEREUM_BRIDGE_ADDRESS";
const POD_TOKEN = "POD_TOKEN_ADDRESS"; // use 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE for the native token
const ETH_TOKEN = "ETH_TOKEN_ADDRESS";
const amount = ethers.parseUnits("100", 18); // Pod's 18 decimals; a whole multiple of 1e12 for a 6-decimal token
const ethRecipient = ethWallet.address;

// deadline: next auction-aligned microsecond timestamp, with headroom
const AUCTION_INTERVAL_US = 500_000n; // the market's auction interval in microseconds
const nowUs = BigInt(Date.now()) * 1000n;
const deadline = ((nowUs + 60_000_000n) / AUCTION_INTERVAL_US + 1n) * AUCTION_INTERVAL_US;

// 1. Withdraw on the Pod bridge precompile (gas-exempt; tx.value must be 0)
const podBridge = new ethers.Contract(
  POD_BRIDGE,
  ["function withdraw(address token, address to, uint256 amount, uint128 deadline)"],
  podWallet
);
const withdrawTx = await podBridge.withdraw(POD_TOKEN, ethRecipient, amount, deadline);
const receipt = await withdrawTx.wait();

// 2. Compute the withdrawal id from (signer, nonce, sequence = 0)
const tx = await podProvider.getTransaction(receipt.hash);
const withdrawalId = ethers.keccak256(
  ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "uint64", "uint32"],
    [podWallet.address, tx.nonce, 0]
  )
);

// 3. Poll for the claim proof (the withdrawal settles at the next batch auction)
let detail;
do {
  await new Promise((r) => setTimeout(r, 500));
  const res = await fetch(`https://rpc.podtestnet.dev/v1/bridge/withdrawals/by-id/${withdrawalId}`);
  detail = res.ok ? await res.json() : undefined;
} while (detail?.status !== "claimable");

// 4. Claim on Ethereum (usually the network's relayer has already done this)
const ethBridge = new ethers.Contract(
  ETH_BRIDGE,
  ["function claim(address token, uint256 amount, address to, bytes proof, bytes auxTxSuffix)"],
  ethWallet
);
const claimTx = await ethBridge.claim(
  ETH_TOKEN,
  detail.proof.amount, // claim-chain units (1e6 for 1 USDC)
  ethRecipient,
  Uint8Array.from(detail.proof.proof),
  Uint8Array.from(detail.proof.aux_tx_suffix)
);
await claimTx.wait();
```
{% endtab %}

{% tab title="Rust (alloy)" %}
```rust
use alloy::providers::{Provider, ProviderBuilder};
use alloy::signers::local::PrivateKeySigner;
use alloy::sol;
use alloy::sol_types::SolValue;
use alloy::primitives::{keccak256, U256};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

sol! {
    #[sol(rpc)]
    contract PodBridge {
        function withdraw(
            address token, address to, uint256 amount, uint128 deadline
        ) public;
    }

    #[sol(rpc)]
    contract EthBridge {
        function claim(
            address token, uint256 amount, address to, bytes proof, bytes auxTxSuffix
        ) public;
    }
}

let signer: PrivateKeySigner = PRIVATE_KEY.parse()?;

let pod_provider = ProviderBuilder::new()
    .wallet(signer.clone())
    .on_http("https://rpc.podtestnet.dev".parse()?);

let eth_provider = ProviderBuilder::new()
    .wallet(signer.clone())
    .on_http("https://eth.llamarpc.com".parse()?);

let pod_token = "POD_TOKEN_ADDRESS".parse()?; // use 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE for the native token
let eth_token = "ETH_TOKEN_ADDRESS".parse()?;
let amount = U256::from(100u64) * U256::from(10u64).pow(U256::from(18)); // Pod's 18 decimals
let eth_recipient = signer.address();

// deadline: next auction-aligned microsecond timestamp, with headroom
let auction_interval_us: u128 = 500_000; // the market's auction interval in microseconds
let now_us = SystemTime::now().duration_since(UNIX_EPOCH)?.as_micros();
let deadline = ((now_us + 60_000_000) / auction_interval_us + 1) * auction_interval_us;

// 1. Withdraw on the Pod bridge precompile (gas-exempt; tx.value must be 0)
let pod_bridge = PodBridge::new(
    "0x50d0000000000000000000000000000000000001".parse()?,
    &pod_provider,
);
let withdraw_receipt = pod_bridge
    .withdraw(pod_token, eth_recipient, amount, deadline)
    .send().await?
    .get_receipt().await?;

// 2. Compute the withdrawal id from (signer, nonce, sequence = 0)
let tx = pod_provider
    .get_transaction_by_hash(withdraw_receipt.transaction_hash)
    .await?
    .expect("withdraw tx");
let withdrawal_id = keccak256((signer.address(), tx.nonce(), 0u32).abi_encode());

// 3. Poll for the claim proof (the withdrawal settles at the next batch auction)
let detail = loop {
    tokio::time::sleep(Duration::from_millis(500)).await;
    let res = reqwest::get(format!(
        "https://rpc.podtestnet.dev/v1/bridge/withdrawals/by-id/{withdrawal_id}"
    ))
    .await?;
    if !res.status().is_success() {
        continue;
    }
    let detail: serde_json::Value = res.json().await?;
    if detail["status"] == "claimable" {
        break detail;
    }
};

// 4. Claim on Ethereum (usually the network's relayer has already done this)
let proof = &detail["proof"];
let proof_bytes: Vec<u8> =
    proof["proof"].as_array().unwrap().iter().map(|v| v.as_u64().unwrap() as u8).collect();
let aux_tx_suffix: Vec<u8> =
    proof["aux_tx_suffix"].as_array().unwrap().iter().map(|v| v.as_u64().unwrap() as u8).collect();
let claim_amount: U256 = proof["amount"].as_str().unwrap().parse()?; // claim-chain units

let eth_bridge = EthBridge::new("ETHEREUM_BRIDGE_ADDRESS".parse()?, &eth_provider);
eth_bridge
    .claim(eth_token, claim_amount, eth_recipient, proof_bytes.into(), aux_tx_suffix.into())
    .send().await?
    .watch().await?;
```
{% endtab %}
{% endtabs %}

{% hint style="info" %}
Anyone can submit the claim transaction on Ethereum - it does not need to come from the original depositor.
{% endhint %}
