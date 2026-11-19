# Use a multisig

This guide shows how to use a 2-of-3 multisig. A 2-of-3 multisig has three members, and a call needs the signatures of two of them. The guide creates the multisig and funds it. Then two members sign a call that withdraws funds to the bridged chain. Last, the guide replaces a member and cancels a signed call. For all rules, see the [Multisig precompile reference](../applications-precompiles/multisig.md).

A multisig call is a Safe transaction (`SafeTx`). Members can sign it with a tool that signs Safe transactions. The tool must not need to read the Safe first (see [Safe tools](../applications-precompiles/multisig.md#safe-tools)). This guide signs the typed data directly.

Two types of keys take part:

* A member only signs. A member does not send transactions and does not need a balance.
* The sender sends the `create` and `execTransaction` transactions. The sender can be any account. It does not have to be a member.

## Steps

1. Calculate the address of the multisig and create the multisig.
2. Fund the multisig.
3. Get the signatures of the members for a call.
4. Send the call with `execTransaction`.
5. Replace a member with `swapOwner`.
6. Cancel a signed call.

The examples are one program. Each step uses the values from the steps before it. All times are in microseconds.

## 1. Create the multisig

The address is a CREATE2 address. Thus you can calculate it before the multisig exists. You must give the members in strictly ascending order.

{% tabs %}
{% tab title="TypeScript (ethers.js)" %}
```typescript
import { ethers } from "ethers";

const RPC = "https://staging-rpc.podtestnet.dev";
const provider = new ethers.JsonRpcProvider(RPC);
const sender = new ethers.Wallet(SENDER_PRIVATE_KEY, provider);
const members = [MEMBER_1_PRIVATE_KEY, MEMBER_2_PRIVATE_KEY, MEMBER_3_PRIVATE_KEY].map((key) => new ethers.Wallet(key));
const { chainId } = await provider.getNetwork();

const MULTISIG = "0x50d0000000000000000000000000000000000004";
const ORDERBOOK = "0x50d0000000000000000000000000000000000002";
const BRIDGE = "0x50d0000000000000000000000000000000000001";
const NATIVE = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const SENTINEL = "0x0000000000000000000000000000000000000001";

const multisigPrecompile = new ethers.Contract(MULTISIG, [
  "function create(address[] members, uint16 threshold, bytes32 salt)",
], sender);

const nowMicros = () => BigInt(Date.now()) * 1000n;
const byAddress = (a: string, b: string) => (BigInt(a) < BigInt(b) ? -1 : 1);

const threshold = 2;
const salt = ethers.id("treasury"); // any bytes32
const memberAddresses = members.map((m) => m.address).sort(byAddress);

const initCodeHash = ethers.keccak256(
  ethers.AbiCoder.defaultAbiCoder().encode(["address[]", "uint16"], [memberAddresses, threshold]),
);
const multisig = ethers.getCreate2Address(MULTISIG, salt, initCodeHash);
console.log("Multisig address:", multisig);

await (await multisigPrecompile.create(memberAddresses, threshold, salt)).wait();

const config = await (await fetch(`${RPC}/v1/multisig/${multisig}`)).json();
console.log(config); // { members: [...], threshold: 2, nonce: 0, timestamp: ... }
```
{% endtab %}

{% tab title="Rust (alloy)" %}
```rust
use alloy::primitives::{Address, Bytes, U256, address, keccak256};
use alloy::providers::{Provider, ProviderBuilder};
use alloy::signers::{Signer, local::PrivateKeySigner};
use alloy::sol;
use alloy::sol_types::{Eip712Domain, SolCall, SolStruct, SolValue, eip712_domain};

sol! {
    #[sol(rpc)]
    contract Multisig {
        function create(address[] members, uint16 threshold, bytes32 salt) external;
    }

    /// Functions at the address of the multisig.
    #[sol(rpc)]
    contract MultisigAccount {
        function execTransaction(
            address to, uint256 value, bytes data, uint8 operation,
            uint256 safeTxGas, uint256 baseGas, uint256 gasPrice,
            address gasToken, address refundReceiver, bytes signatures
        ) external payable returns (bool success);
        function swapOwner(address prevOwner, address oldOwner, address newOwner) external;
    }

    struct SafeTx {
        address to; uint256 value; bytes data; uint8 operation;
        uint256 safeTxGas; uint256 baseGas; uint256 gasPrice;
        address gasToken; address refundReceiver; uint256 nonce;
    }

    #[sol(rpc)]
    contract Orderbook {
        function transfer(address token, address recipient, uint256 amount, uint128 deadline) external;
        function balanceOf(address token, address account) external view returns (int256);
    }

    interface Bridge {
        function withdraw(address token, address to, uint256 amount, uint128 deadline) external;
    }
}

const RPC: &str = "https://staging-rpc.podtestnet.dev";
const MULTISIG: Address = address!("0x50d0000000000000000000000000000000000004");
const ORDERBOOK: Address = address!("0x50d0000000000000000000000000000000000002");
const BRIDGE: Address = address!("0x50d0000000000000000000000000000000000001");
const NATIVE: Address = address!("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE");
const SENTINEL: Address = address!("0x0000000000000000000000000000000000000001");

let sender: PrivateKeySigner = SENDER_PRIVATE_KEY.parse()?;
let members: Vec<PrivateKeySigner> = [MEMBER_1_PRIVATE_KEY, MEMBER_2_PRIVATE_KEY, MEMBER_3_PRIVATE_KEY]
    .iter()
    .map(|key| key.parse())
    .collect::<Result<_, _>>()?;

let provider = ProviderBuilder::new().wallet(sender).connect_http(RPC.parse()?);
let chain_id = provider.get_chain_id().await?;
let precompile = Multisig::new(MULTISIG, &provider);

let now_micros = || {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_micros() as u64
};

let threshold = 2u16;
let salt = keccak256("treasury"); // any bytes32
let mut member_addresses: Vec<Address> = members.iter().map(|m| m.address()).collect();
member_addresses.sort();

let init_code_hash = keccak256((member_addresses.clone(), threshold).abi_encode_params());
let multisig = MULTISIG.create2(salt, init_code_hash);
println!("Multisig address: {multisig}");

precompile
    .create(member_addresses.clone(), threshold, salt)
    .send().await?
    .get_receipt().await?;

let config: serde_json::Value =
    reqwest::get(format!("{RPC}/v1/multisig/{multisig}")).await?.json().await?;
println!("{config}"); // {"members":[...],"nonce":0,"threshold":2,"timestamp":...}
```
{% endtab %}
{% endtabs %}

If the `create` receipt failed, the address already holds a multisig. Read `GET /v1/multisig/{address}` to see its current members and threshold.

## 2. Fund the multisig

The balance of the multisig is the balance of its address. You can deposit to it through the bridge (see [Bridge to Pod](bridge-to-pod.md)). You can also move funds from another account with an orderbook `transfer`. This example uses a `transfer`. Both methods work before you create the multisig.

{% tabs %}
{% tab title="TypeScript (ethers.js)" %}
```typescript
const orderbook = new ethers.Contract(ORDERBOOK, [
  "function transfer(address token, address recipient, uint256 amount, uint128 deadline)",
  "function balanceOf(address token, address account) view returns (int256)",
], sender);

const AUCTION_INTERVAL = 500_000n; // 500 ms, in microseconds
const nextDeadline = () =>
  ((nowMicros() + 2_000_000n) / AUCTION_INTERVAL + 1n) * AUCTION_INTERVAL;

const amount = ethers.parseEther("1");
await (await orderbook.transfer(NATIVE, multisig, amount, nextDeadline())).wait();
while ((await orderbook.balanceOf(NATIVE, multisig)) < amount) {
  await new Promise((resolve) => setTimeout(resolve, 500));
}
```
{% endtab %}

{% tab title="Rust (alloy)" %}
```rust
let orderbook = Orderbook::new(ORDERBOOK, &provider);

const AUCTION_INTERVAL: u64 = 500_000; // 500 ms, in microseconds
let next_deadline = || (now_micros() + 2_000_000) / AUCTION_INTERVAL * AUCTION_INTERVAL + AUCTION_INTERVAL;

let one = U256::from(10u64).pow(U256::from(18u64));
orderbook
    .transfer(NATIVE, multisig, one, next_deadline().into())
    .send().await?
    .get_receipt().await?;
while orderbook.balanceOf(NATIVE, multisig).call().await?.into_raw() < one {
    tokio::time::sleep(std::time::Duration::from_millis(500)).await;
}
```
{% endtab %}
{% endtabs %}

## 3. Sign a call

A call is a `SafeTx`. It has one inner call: a target address `to`, a `value` and ABI-encoded calldata `data`. The inner call is the call that the multisig makes.

This call withdraws 0.5 of the native token to an address on the bridged chain, with `Bridge.withdraw`. Orderbook calls, for example `submitOrder` or `cancel`, are inner calls in the same way. Their target is the orderbook.

Set the fields of the `SafeTx` as follows:

* `nonce` is the next nonce of the multisig. Read it from the `nonce` field of `GET /v1/multisig/{address}`.
* `operation`, `safeTxGas`, `baseGas` and `gasPrice` are 0.
* `gasToken` and `refundReceiver` are the zero address.
* `value` is 0, except for a transfer of the native token.

Each member signs the `SafeTx` as EIP-712 typed data. The domain has only `chainId` and `verifyingContract`, and `verifyingContract` is the address of the multisig. Usually each member signs on a different device, with `eth_signTypedData_v4` in a wallet. Then the member sends the signature to the account that sends the call.

The sender joins the signatures into one byte string, in ascending order of signer address. The [precompile reference](../applications-precompiles/multisig.md#the-signed-call) shows the full typed-data payload.

{% tabs %}
{% tab title="TypeScript (ethers.js)" %}
```typescript
const domain = { chainId, verifyingContract: multisig };
const types = {
  SafeTx: [
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "data", type: "bytes" },
    { name: "operation", type: "uint8" },
    { name: "safeTxGas", type: "uint256" },
    { name: "baseGas", type: "uint256" },
    { name: "gasPrice", type: "uint256" },
    { name: "gasToken", type: "address" },
    { name: "refundReceiver", type: "address" },
    { name: "nonce", type: "uint256" },
  ],
};

const safeTx = (to: string, data: string, nonce: bigint) => ({
  to, value: 0n, data, operation: 0,
  safeTxGas: 0n, baseGas: 0n, gasPrice: 0n,
  gasToken: ethers.ZeroAddress, refundReceiver: ethers.ZeroAddress,
  nonce,
});
type SafeTx = ReturnType<typeof safeTx>;

const sign = async (tx: SafeTx, signers: ethers.Wallet[]) =>
  ethers.concat(await Promise.all(
    [...signers]
      .sort((a, b) => byAddress(a.address, b.address))
      .map((signer) => signer.signTypedData(domain, types, tx)),
  ));

const bridge = new ethers.Interface([
  "function withdraw(address token, address to, uint256 amount, uint128 deadline)",
]);
const withdraw = safeTx(
  BRIDGE,
  bridge.encodeFunctionData("withdraw", [NATIVE, BRIDGED_CHAIN_RECIPIENT, ethers.parseEther("0.5"), nextDeadline()]),
  0n,
);
const signatures = await sign(withdraw, [members[0], members[1]]);
```
{% endtab %}

{% tab title="Rust (alloy)" %}
```rust
let domain = eip712_domain! {
    chain_id: chain_id,
    verifying_contract: multisig,
};

let safe_tx = |to: Address, data: Bytes, nonce: u64| SafeTx {
    to,
    value: U256::ZERO,
    data,
    operation: 0,
    safeTxGas: U256::ZERO,
    baseGas: U256::ZERO,
    gasPrice: U256::ZERO,
    gasToken: Address::ZERO,
    refundReceiver: Address::ZERO,
    nonce: U256::from(nonce),
};

async fn sign(
    tx: &SafeTx,
    domain: &Eip712Domain,
    signers: &[&PrivateKeySigner],
) -> alloy::signers::Result<Bytes> {
    let mut signers = signers.to_vec();
    signers.sort_by_key(|signer| signer.address());
    let hash = tx.eip712_signing_hash(domain);
    let mut packed = Vec::new();
    for signer in signers {
        packed.extend_from_slice(&signer.sign_hash(&hash).await?.as_bytes());
    }
    Ok(packed.into())
}

let withdraw = safe_tx(
    BRIDGE,
    Bridge::withdrawCall {
        token: NATIVE,
        to: BRIDGED_CHAIN_RECIPIENT,
        amount: one / U256::from(2u64),
        deadline: next_deadline().into(),
    }
    .abi_encode()
    .into(),
    0,
);
let signatures = sign(&withdraw, &domain, &[&members[0], &members[1]]).await?;
```
{% endtab %}
{% endtabs %}

## 4. Execute the call

Any account that has the signatures can send `execTransaction`. Send it to the address of the multisig, not to the precompile. If the receipt is a success, the call was authorized and ran. The nonce of the multisig is now 1.

The receipt does not show the result of the inner call. Read the usual outcomes for this result. In this example, the outcome is the withdrawal of the multisig. Its id is the hash of the `execTransaction` transaction.

{% tabs %}
{% tab title="TypeScript (ethers.js)" %}
```typescript
const account = new ethers.Contract(multisig, [
  "function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) payable returns (bool)",
], sender);
const exec = async (tx: SafeTx, signatures: string) =>
  (await account.execTransaction(
    tx.to, tx.value, tx.data, tx.operation, tx.safeTxGas, tx.baseGas, tx.gasPrice,
    tx.gasToken, tx.refundReceiver, signatures,
  )).wait();

const receipt = await exec(withdraw, signatures);
console.log("execTransaction tx:", receipt!.hash);

const activity = await (
  await fetch(`${RPC}/v1/clob/activity/${multisig}?activity_types=multisig_call,bridge_transfer`)
).json();
console.log(JSON.stringify(activity.activity));
// { "<batch>": [ { "k": "bridge_transfer", "tx": "<execTransaction hash>", "amt": "-500000000000000000", ... },
//                { "k": "multisig_call", "tx": "<execTransaction hash>", "nonce": 0, ... } ] }
```
{% endtab %}

{% tab title="Rust (alloy)" %}
```rust
let account = MultisigAccount::new(multisig, &provider);
let exec = |tx: SafeTx, signatures: Bytes| {
    account.execTransaction(
        tx.to, tx.value, tx.data, tx.operation, tx.safeTxGas, tx.baseGas, tx.gasPrice,
        tx.gasToken, tx.refundReceiver, signatures,
    )
};

let receipt = exec(withdraw, signatures).send().await?.get_receipt().await?;
println!("execTransaction tx: {}", receipt.transaction_hash);

let activity: serde_json::Value = reqwest::get(format!(
    "{RPC}/v1/clob/activity/{multisig}?activity_types=multisig_call,bridge_transfer"
))
.await?
.json()
.await?;
println!("{activity}");
```
{% endtab %}
{% endtabs %}

To claim the withdrawal on the bridged chain, follow [Bridge from Pod](bridge-from-pod.md). Use the hash of the `execTransaction` transaction for the lookup: `GET /v1/bridge/withdrawals/by-id/{execTransaction hash}`.

If the `execTransaction` receipt failed, Pod refused the call. The inner call did not run, and the nonce of the multisig did not change. The reason is in the `err` field of the `multisig_call` entry in the activity of the sender. For example, `non_member` means that a signature does not come from a member. A signature for a different nonce also gives `non_member`. For all reasons, see [Outcomes](../applications-precompiles/multisig.md#outcomes).

## 5. Replace a member

`swapOwner(prevOwner, oldOwner, newOwner)` is an inner call with the address of the multisig as its target. This call replaces the third member with a new member. The threshold stays at 2.

`prevOwner` is the member just below `oldOwner` in address order. If `oldOwner` is the lowest member, `prevOwner` is `0x0000000000000000000000000000000000000001`. The `members` list of `GET /v1/multisig/{address}` is in address order.

The change applies when the call runs. The next call needs signatures from the new members. The address does not change.

{% tabs %}
{% tab title="TypeScript (ethers.js)" %}
```typescript
const owners = new ethers.Interface([
  "function swapOwner(address prevOwner, address oldOwner, address newOwner)",
]);
const newcomer = new ethers.Wallet(NEWCOMER_PRIVATE_KEY);
const oldOwner = members[2].address;
const index = memberAddresses.indexOf(oldOwner);
const prevOwner = index === 0 ? SENTINEL : memberAddresses[index - 1];

const rotate = safeTx(
  multisig,
  owners.encodeFunctionData("swapOwner", [prevOwner, oldOwner, newcomer.address]),
  1n,
);
await exec(rotate, await sign(rotate, [members[0], members[1]]));
```
{% endtab %}

{% tab title="Rust (alloy)" %}
```rust
let newcomer: PrivateKeySigner = NEWCOMER_PRIVATE_KEY.parse()?;
let old_owner = members[2].address();
let index = member_addresses.iter().position(|member| *member == old_owner).unwrap();
let prev_owner = if index == 0 { SENTINEL } else { member_addresses[index - 1] };

let rotate = safe_tx(
    multisig,
    MultisigAccount::swapOwnerCall {
        prevOwner: prev_owner,
        oldOwner: old_owner,
        newOwner: newcomer.address(),
    }
    .abi_encode()
    .into(),
    1,
);
let signatures = sign(&rotate, &domain, &[&members[0], &members[1]]).await?;
exec(rotate, signatures).send().await?.get_receipt().await?;
```
{% endtab %}
{% endtabs %}

To add a member, use `addOwnerWithThreshold`. To remove a member, use `removeOwner`. To change only the threshold, use `changeThreshold`. See [Member changes](../applications-precompiles/multisig.md#member-changes).

## 6. Cancel a signed call

A signed call does not expire, and there is no cancel function. In this example, members signed a call with nonce 2, and that call must not run. To cancel it, run a different call with nonce 2. That call uses the nonce. After it runs, the signed call cannot run.

The cancel call has empty `data` and a `value` of 0. It runs nothing. Its target can be any address. This example uses the address of the multisig, as the Safe SDK does.

{% tabs %}
{% tab title="TypeScript (ethers.js)" %}
```typescript
const cancel = safeTx(multisig, "0x", 2n);
await exec(cancel, await sign(cancel, [members[0], newcomer]));
```
{% endtab %}

{% tab title="Rust (alloy)" %}
```rust
let cancel = safe_tx(multisig, Bytes::new(), 2);
let signatures = sign(&cancel, &domain, &[&members[0], &newcomer]).await?;
exec(cancel, signatures).send().await?.get_receipt().await?;
```
{% endtab %}
{% endtabs %}

The cancel call needs `threshold` signatures from the current members, as all calls do.

For the limits, see [Limits](../applications-precompiles/multisig.md#limits). For all refusal reasons, see [Outcomes](../applications-precompiles/multisig.md#outcomes).
