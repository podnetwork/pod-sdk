# Bridge to Pod

This guide walks through bridging ERC20 tokens from Ethereum to Pod. For background on how the bridge works, see [Native Bridge](../../protocol/native-bridge.md).

## Steps

1. Call `deposit(token, amount, podRecipient, permit)` on the Ethereum bridge contract with an EIP-2612 permit.
2. Once the deposit is finalized on Ethereum, Pod validators automatically credit the balance on Pod. No claim is needed.

{% tabs %}
{% tab title="TypeScript (ethers.js)" %}
```typescript
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("https://eth.llamarpc.com");
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const BRIDGE = "ETHEREUM_BRIDGE_ADDRESS";
const TOKEN = "TOKEN_ADDRESS"; // use 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE for native token
const amount = ethers.parseUnits("100", 6);
const podRecipient = wallet.address;

// Sign an EIP-2612 permit for gasless approval.
// If the token does not support permit, set permit to "0x" and
// send a separate approval transaction:
//   const token = new ethers.Contract(TOKEN, ["function approve(address,uint256)"], wallet);
//   await (await token.approve(BRIDGE, amount)).wait();
const permit = "0x";

const bridge = new ethers.Contract(
  BRIDGE,
  ["function deposit(address token, uint256 amount, address to, bytes permit) returns (uint256)"],
  wallet
);
const tx = await bridge.deposit(TOKEN, amount, podRecipient, permit);
await tx.wait();
// Tokens will be credited on Pod once the deposit is finalized on Ethereum
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
    contract Bridge {
        function deposit(
            address token, uint256 amount, address to, bytes permit
        ) public returns (uint256);
    }
}

let signer: PrivateKeySigner = PRIVATE_KEY.parse()?;
let provider = ProviderBuilder::new()
    .wallet(signer.clone())
    .on_http("https://eth.llamarpc.com".parse()?);

let bridge_address = "ETHEREUM_BRIDGE_ADDRESS".parse()?;
let token_address = "TOKEN_ADDRESS".parse()?; // use 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE for native token
let amount = U256::from(100_000_000u64); // e.g. 100 USDC
let pod_recipient = signer.address();

// Sign an EIP-2612 permit for gasless approval.
// If the token does not support permit, set permit to empty bytes and
// send a separate approval transaction first.
let permit = vec![];

let bridge = Bridge::new(bridge_address, &provider);
bridge
    .deposit(token_address, amount, pod_recipient, permit.into())
    .send().await?.watch().await?;
// Tokens will be credited on Pod once the deposit is finalized on Ethereum
```
{% endtab %}
{% endtabs %}
