# Recover a Locked Account

If your account is locked due to conflicting transactions at the same nonce, you can recover it by calling the recovery precompile. For background on why accounts get locked and how the recovery protocol works, see [Local Ordering](../../protocol/network-architecture/local-ordering.md#account-locking-and-recovery).

## Steps

1. Call `pod_getRecoveryTargetTx(account)` on the full node to get the target transaction to recover to.
2. Send a transaction to the recovery precompile at `0x0000000000000000000000000000000004EC0EE4`, calling `recover(txHash, nonce)` with the values from step 1.

The protocol will finalize the target transaction chain, recover your account state, and increment the nonce. You can then send a new transaction with the next nonce.

{% tabs %}
{% tab title="TypeScript (ethers.js)" %}
```typescript
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("https://rpc.v1.dev.pod.network");
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const RECOVERY = "0x0000000000000000000000000000000004EC0EE4";
const abi = ["function recover(bytes32 txHash, uint64 nonce) public"];
const recovery = new ethers.Contract(RECOVERY, abi, wallet);

// 1. Get the recovery target for the locked account
const { txHash: targetTxHash, nonce } = await provider.send("pod_getRecoveryTargetTx", [wallet.address]);

// 2. Call the recovery precompile
const tx = await recovery.recover(targetTxHash, nonce);
await tx.wait();
```
{% endtab %}

{% tab title="Rust (alloy)" %}
```rust
use alloy::providers::{Provider, ProviderBuilder};
use alloy::signers::local::PrivateKeySigner;
use alloy::sol;

sol! {
    #[sol(rpc)]
    contract Recovery {
        function recover(bytes32 txHash, uint64 nonce) public;
    }
}

let signer: PrivateKeySigner = PRIVATE_KEY.parse()?;
let provider = ProviderBuilder::new()
    .wallet(signer)
    .on_http("https://rpc.v1.dev.pod.network".parse()?);

let recovery = Recovery::new(
    "0x0000000000000000000000000000000004EC0EE4".parse()?,
    &provider,
);

// 1. Get the recovery target for the locked account
let target: TargetTx = provider
    .raw_request("pod_getRecoveryTargetTx".into(), vec![account_address])
    .await?;

// 2. Call the recovery precompile
let receipt = recovery
    .recover(target.tx_hash, target.nonce)
    .send()
    .await?
    .watch()
    .await?;
```
{% endtab %}
{% endtabs %}
