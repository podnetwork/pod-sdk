# Bridge to Pod

This guide walks through bridging ERC20 tokens from Ethereum to Pod. For background on how the bridge works, see [Native Bridge](https://docs.v2.pod.network/documentation/native-bridge).

## Simple Deposit

Deposit tokens to Pod with the full amount credited to your account.

### Steps

1. Call `deposit(token, amount, podRecipient, callContract, reserveBalance, permit)` on the Ethereum bridge contract. Set `callContract` to `address(0)` and `reserveBalance` to `0` for a simple deposit.
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
  ["function deposit(address token, uint256 amount, address to, address callContract, uint256 reserveBalance, bytes permit) returns (uint256)"],
  wallet
);
const tx = await bridge.deposit(TOKEN, amount, podRecipient, ethers.ZeroAddress, 0, permit);
await tx.wait();
// Tokens will be credited on Pod once the deposit is finalized on Ethereum
```
{% endtab %}

{% tab title="Rust (alloy)" %}
```rust
use alloy::providers::{Provider, ProviderBuilder};
use alloy::signers::local::PrivateKeySigner;
use alloy::sol;
use alloy::primitives::{Address, U256};

sol! {
    #[sol(rpc)]
    contract Bridge {
        function deposit(
            address token, uint256 amount, address to,
            address callContract, uint256 reserveBalance, bytes permit
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
    .deposit(token_address, amount, pod_recipient, Address::ZERO, U256::ZERO, permit.into())
    .send().await?.watch().await?;
// Tokens will be credited on Pod once the deposit is finalized on Ethereum
```
{% endtab %}
{% endtabs %}

## Deposit and Call (Bridge + Orderbook Deposit)

Bridge tokens from Ethereum and deposit them into a whitelisted contract (e.g. the orderbook) on Pod in one step. This avoids needing a separate transaction on Pod after bridging.

The `callContract` parameter specifies which contract on Pod to call with the bridged funds. The `reserveBalance` parameter controls how much to keep in your EOA — the rest is forwarded to the contract. The callee contract receives a `deposit(token, amount, to)` call.

### Steps

1. Call `deposit(token, amount, podRecipient, callContract, reserveBalance, permit)` on the Ethereum bridge contract with `callContract` set to the orderbook address and `reserveBalance` set to the amount you want to keep in your EOA.
2. Once finalized on Ethereum, Pod validators credit `reserveBalance` to your account and forward the remainder to the contract.

{% tabs %}
{% tab title="TypeScript (ethers.js)" %}
```typescript
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("https://eth.llamarpc.com");
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const BRIDGE = "ETHEREUM_BRIDGE_ADDRESS";
const TOKEN = "TOKEN_ADDRESS";
const ORDERBOOK = "POD_ORDERBOOK_ADDRESS"; // must be whitelisted on the bridge
const amount = ethers.parseUnits("1000", 6); // 1000 USDC
const reserveBalance = ethers.parseUnits("100", 6); // keep 100 USDC in EOA, deposit 900 to orderbook

const permit = "0x";

const bridge = new ethers.Contract(
  BRIDGE,
  ["function deposit(address token, uint256 amount, address to, address callContract, uint256 reserveBalance, bytes permit) returns (uint256)"],
  wallet
);
const tx = await bridge.deposit(TOKEN, amount, wallet.address, ORDERBOOK, reserveBalance, permit);
await tx.wait();
// 100 USDC credited to your Pod account, 900 USDC deposited into the orderbook
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
            address token, uint256 amount, address to,
            address callContract, uint256 reserveBalance, bytes permit
        ) public returns (uint256);
    }
}

let signer: PrivateKeySigner = PRIVATE_KEY.parse()?;
let provider = ProviderBuilder::new()
    .wallet(signer.clone())
    .on_http("https://eth.llamarpc.com".parse()?);

let bridge_address = "ETHEREUM_BRIDGE_ADDRESS".parse()?;
let token_address = "TOKEN_ADDRESS".parse()?;
let orderbook_address = "POD_ORDERBOOK_ADDRESS".parse()?; // must be whitelisted on the bridge
let amount = U256::from(1_000_000_000u64); // 1000 USDC
let reserve_balance = U256::from(100_000_000u64); // keep 100 USDC in EOA

let permit = vec![];

let bridge = Bridge::new(bridge_address, &provider);
bridge
    .deposit(token_address, amount, signer.address(), orderbook_address, reserve_balance, permit.into())
    .send().await?.watch().await?;
// 100 USDC credited to your Pod account, 900 USDC deposited into the orderbook
```
{% endtab %}
{% endtabs %}
