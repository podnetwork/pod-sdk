# Bridge to Pod

This guide walks through bridging ERC20 tokens from Ethereum to Pod. For background on how the bridge works, see [Native Bridge](https://docs.v2.pod.network/documentation/native-bridge).

{% hint style="info" %}
**Bridging in is how you fund a Pod account, and it is a single step.** The deposit is credited straight to the recipient's balance — available for trading. The Orderbook precompile has no `deposit`.
{% endhint %}

{% hint style="warning" %}
**`deposit` may be relayer-only on the deployment you are targeting.** The bridge contract has a Private mode in which only a permissioned relayer deposits on users' behalf; `deposit` is gated on the contract being Public and otherwise reverts with `ContractPaused`. If your own call reverts that way, the deposit goes through the operator's relayer rather than directly.
{% endhint %}

## Deposit

Deposit tokens on Ethereum; the full amount is credited to the recipient's balance on Pod.

### Steps

1. Call `deposit(token, amount, podRecipient, callContract, reserveBalance, permit)` on the Ethereum bridge contract. Set `callContract` to `address(0)` and `reserveBalance` to `0` — see the note below on why.
2. Once the deposit is finalized on Ethereum, Pod validators automatically credit the balance on Pod. No claim is needed, and you send no transaction on Pod.

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
// Credited to podRecipient's balance once the deposit is finalized
// on Ethereum, scaled up to Pod's 18 decimals. Read it back with
// balanceOf(token, account) on the orderbook precompile.
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
// Credited to pod_recipient's balance once the deposit is finalized
// on Ethereum, scaled up to Pod's 18 decimals. Read it back with
// balanceOf(token, account) on the orderbook precompile.
```
{% endtab %}
{% endtabs %}

## `callContract` and `reserveBalance`

These two parameters used to split a deposit between a Pod account and a contract on Pod. **They no longer route anything on Pod.** Every deposit is credited whole to the recipient's balance, because that is now the only balance there is to credit. The values are still carried through to the Pod-side `DepositApplied` event so the two chains reconcile, but they change nothing about where the funds land.

They are still **validated on Ethereum**, so a stale non-zero value is a revert rather than a harmless no-op. The Ethereum contract rejects:

* a `callContract` the admin has not whitelisted via `setCallContractWhitelist` (`CallContractNotWhitelisted`),
* a `reserveBalance` greater than `amount` (`AmountBelowReserve`),
* any non-zero `reserveBalance` when `callContract` is `address(0)` (`InvalidReserveBalance`).

Pass `address(0)` and `0`.

## Amounts and decimals

`amount` is in the **Ethereum token's** units — `1000000` for 1 USDC, not `1e18`. The bridge scales it up to Pod's 18 decimals when it credits the balance, so 1 USDC deposited reads back as `1e18` from `balanceOf`.

The bridge contract enforces a per-token minimum and a rolling daily cap, and the token must be whitelisted by the bridge admin before it can be deposited at all.

## Next steps

* Trade the balance — see [Place a spot order](place-a-spot-order.md) or [Place a perpetual order](place-a-perpetual-order.md).
* Send some of it to another Pod account with the orderbook precompile's [`transfer`](../applications-precompiles/orderbook.md#transfers-between-accounts).
* Take it off Pod again with [Bridge from Pod](bridge-from-pod.md).
