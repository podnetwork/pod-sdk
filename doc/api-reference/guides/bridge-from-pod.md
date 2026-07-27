# Bridge from Pod

This guide walks through bridging ERC20 tokens from Pod to Ethereum. For background on how the bridge works, see [Native Bridge](https://docs.v2.pod.network/documentation/native-bridge).

## Decimal Scaling

All tokens on Pod are represented with 18 decimals, regardless of their decimals on Ethereum. When calling `withdraw` on the Pod bridge precompile, the `amount` must be specified in the **Ethereum token's units**. For example, to bridge 1 USDC (6 decimals on Ethereum), pass `1000000` (1e6), not `1000000000000000000` (1e18).

{% hint style="warning" %}
**Setting `tx.value` depends on the token:**

- **Native token** (`0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE`): the coin is sent with the transaction, so set `tx.value` to the `amount` **scaled up to Pod's 18 decimals**. For example, bridging 1 USDC uses `amount = 1000000` (1e6) and `tx.value = 1000000000000000000` (1e18). A native withdraw is rejected unless `tx.value` equals the scaled amount — this keeps gas accounting correct (`native >= tx.value + gas`), so you cannot bridge your whole balance and leave nothing to pay for gas.
- **ERC20 tokens**: set `tx.value` to `0`. The balance is deducted internally.
{% endhint %}

## Steps

1. Call `withdraw(token, amount, ethRecipient, chainId)` on the Pod bridge precompile. The `chainId` is the chain ID of the target chain (e.g. `1` for Ethereum mainnet) — it prevents the withdrawal proof from being replayed on other chains.
2. Call `pod_getBridgeClaimProof(txHash)` on the full node to get the claim proof.
3. Call `claim(token, amount, ethRecipient, proof, auxTxSuffix)` on the Ethereum bridge contract.

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
const NATIVE_TOKEN = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const POD_TOKEN = "POD_TOKEN_ADDRESS"; // use NATIVE_TOKEN for the native token
const ETH_TOKEN = "ETH_TOKEN_ADDRESS";
const ETH_DECIMALS = 6; // token's decimals on Ethereum (e.g. 6 for USDC)
const amount = ethers.parseUnits("100", ETH_DECIMALS); // amount in Ethereum token units
const ethRecipient = ethWallet.address;
const ETH_CHAIN_ID = 1; // Ethereum mainnet chain ID

// 1. Withdraw on Pod bridge precompile.
// For the native token, tx.value must equal the amount scaled to Pod's 18
// decimals; for ERC20 tokens it must be 0.
const value =
  POD_TOKEN.toLowerCase() === NATIVE_TOKEN.toLowerCase()
    ? amount * 10n ** BigInt(18 - ETH_DECIMALS)
    : 0n;
const podBridge = new ethers.Contract(
  POD_BRIDGE,
  ["function withdraw(address token, uint256 amount, address to, uint256 chainId) returns (bytes32)"],
  podWallet
);
const withdrawTx = await podBridge.withdraw(POD_TOKEN, amount, ethRecipient, ETH_CHAIN_ID, { value });
const receipt = await withdrawTx.wait();

// 2. Get claim proof
const claimProof = await podProvider.send("pod_getBridgeClaimProof", [receipt.hash]);

// 3. Claim on Ethereum
const ethBridge = new ethers.Contract(
  ETH_BRIDGE,
  ["function claim(address token, uint256 amount, address to, bytes proof, bytes auxTxSuffix)"],
  ethWallet
);
const claimTx = await ethBridge.claim(
  ETH_TOKEN, amount, ethRecipient, claimProof.proof, claimProof.auxTxSuffix
);
await claimTx.wait();
```
{% endtab %}

{% tab title="Rust (alloy)" %}
```rust
use alloy::providers::{Provider, ProviderBuilder};
use alloy::signers::local::PrivateKeySigner;
use alloy::sol;
use alloy::primitives::U256;

sol! {
    #[sol(rpc)]
    contract PodBridge {
        function withdraw(
            address token, uint256 amount, address to, uint256 chainId
        ) public returns (bytes32);
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

let native_token = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE".parse()?;
let pod_token = "POD_TOKEN_ADDRESS".parse()?; // use native_token for the native token
let eth_token = "ETH_TOKEN_ADDRESS".parse()?;
let eth_decimals = 6u32; // token's decimals on Ethereum (e.g. 6 for USDC)
let amount = U256::from(100_000_000u64); // amount in Ethereum token units (100 USDC = 100 * 1e6)
let eth_recipient = signer.address();
let eth_chain_id = U256::from(1u64); // Ethereum mainnet chain ID

// 1. Withdraw on Pod bridge precompile.
// For the native token, tx.value must equal the amount scaled to Pod's 18
// decimals; for ERC20 tokens it must be 0.
let value = if pod_token == native_token {
    amount * U256::from(10u64).pow(U256::from(18 - eth_decimals))
} else {
    U256::ZERO
};
let pod_bridge = PodBridge::new(
    "0x50d0000000000000000000000000000000000001".parse()?,
    &pod_provider,
);
let withdraw_receipt = pod_bridge
    .withdraw(pod_token, amount, eth_recipient, eth_chain_id)
    .value(value)
    .send().await?
    .get_receipt().await?;

// 2. Get claim proof
let claim_proof: serde_json::Value = pod_provider
    .raw_request(
        "pod_getBridgeClaimProof".into(),
        vec![withdraw_receipt.transaction_hash],
    )
    .await?;

// 3. Claim on Ethereum
let eth_bridge = EthBridge::new(
    "ETHEREUM_BRIDGE_ADDRESS".parse()?,
    &eth_provider,
);
eth_bridge
    .claim(
        eth_token,
        amount,
        eth_recipient,
        claim_proof["proof"].as_str().unwrap().parse()?,
        claim_proof["auxTxSuffix"].as_str().unwrap().parse()?,
    )
    .send().await?
    .watch().await?;
```
{% endtab %}
{% endtabs %}

{% hint style="info" %}
Anyone can submit the claim transaction on Ethereum - it does not need to come from the original depositor.
{% endhint %}
