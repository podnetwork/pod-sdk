# Bridge from Pod

This guide walks through bridging ERC20 tokens from Pod to Ethereum. For background on how the bridge works, see [Native Bridge](../../protocol/native-bridge.md).

## Steps

1. Call `deposit(token, amount, ethRecipient)` on the Pod bridge precompile.
2. Call `pod_getBridgeClaimProof(txHash)` on the full node to get the claim proof.
3. Call `claim(token, amount, ethRecipient, proof, auxTxSuffix)` on the Ethereum bridge contract.

{% tabs %}
{% tab title="TypeScript (ethers.js)" %}
```typescript
import { ethers } from "ethers";

const podProvider = new ethers.JsonRpcProvider("https://rpc.v1.dev.pod.network");
const ethProvider = new ethers.JsonRpcProvider("https://eth.llamarpc.com");
const podWallet = new ethers.Wallet(PRIVATE_KEY, podProvider);
const ethWallet = new ethers.Wallet(PRIVATE_KEY, ethProvider);

const POD_BRIDGE = "0x000000000000000000000000000000000000C10";
const ETH_BRIDGE = "ETHEREUM_BRIDGE_ADDRESS";
const POD_TOKEN = "POD_TOKEN_ADDRESS"; // use 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE for native token
const ETH_TOKEN = "ETH_TOKEN_ADDRESS";
const amount = ethers.parseUnits("100", 6);
const ethRecipient = ethWallet.address;

// 1. Deposit on Pod bridge precompile
const podBridge = new ethers.Contract(
  POD_BRIDGE,
  ["function deposit(address token, uint256 amount, address to) returns (bytes32)"],
  podWallet
);
const depositTx = await podBridge.deposit(POD_TOKEN, amount, ethRecipient);
const receipt = await depositTx.wait();

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
        function deposit(address token, uint256 amount, address to) public returns (bytes32);
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
    .on_http("https://rpc.v1.dev.pod.network".parse()?);

let eth_provider = ProviderBuilder::new()
    .wallet(signer.clone())
    .on_http("https://eth.llamarpc.com".parse()?);

let pod_token = "POD_TOKEN_ADDRESS".parse()?; // use 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE for native token
let eth_token = "ETH_TOKEN_ADDRESS".parse()?;
let amount = U256::from(100_000_000u64); // e.g. 100 USDC
let eth_recipient = signer.address();

// 1. Deposit on Pod bridge precompile
let pod_bridge = PodBridge::new(
    "0x000000000000000000000000000000000000C10".parse()?,
    &pod_provider,
);
let deposit_receipt = pod_bridge
    .deposit(pod_token, amount, eth_recipient)
    .send().await?
    .get_receipt().await?;

// 2. Get claim proof
let claim_proof: serde_json::Value = pod_provider
    .raw_request(
        "pod_getBridgeClaimProof".into(),
        vec![deposit_receipt.transaction_hash],
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
