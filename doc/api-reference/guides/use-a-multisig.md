# Use a multisig

This guide shows how to use a 2-of-3 multisig. A 2-of-3 multisig has three members, and a call needs the signatures of two of them. The guide creates the multisig and funds it. Then two members sign a call that withdraws funds to the bridged chain. Last, the guide replaces a member and cancels a signed call. For all rules, see the [Multisig precompile reference](../applications-precompiles/multisig.md).

Two types of keys take part:

* A member only signs. A member does not send transactions and does not need a balance.
* The sender sends the `create` and `execute` transactions. The sender can be any account. It does not have to be a member.

## Steps

1. Calculate the address of the multisig and create the multisig.
2. Fund the multisig.
3. Get the signatures of the members for a call.
4. Send the call with `execute`.
5. Replace a member with `setConfig`.
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

const multisigPrecompile = new ethers.Contract(MULTISIG, [
  "function create(address[] members, uint16 threshold, bytes32 salt)",
  "function execute(address multisig, (uint64 nonce, uint64 validUntil, (address target, bytes data)[] calls) call, bytes[] signatures)",
], sender);

const nowMicros = () => BigInt(Date.now()) * 1000n;

const threshold = 2;
const salt = ethers.id("treasury"); // any bytes32
const memberAddresses = members
  .map((m) => m.address)
  .sort((a, b) => (BigInt(a) < BigInt(b) ? -1 : 1));

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
use alloy::sol_types::{SolCall, SolStruct, SolValue, eip712_domain};

sol! {
    #[sol(rpc)]
    contract Multisig {
        struct InnerCall { address target; bytes data; }
        struct Call { uint64 nonce; uint64 validUntil; InnerCall[] calls; }

        function create(address[] members, uint16 threshold, bytes32 salt) external;
        function execute(address multisig, Call call, bytes[] signatures) external;
    }

    /// Called on the multisig's own address, as an inner call.
    interface MultisigAccount {
        function setConfig(address[] members, uint16 threshold) external;
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

If the `create` receipt failed, the address already holds a multisig. The address depends only on the members, the threshold and the salt. Thus the existing multisig has the configuration that you wanted. It is possible that a different account sent `create` with the same values.

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

A call has a nonce, a `validUntil` time, and a list of inner calls. An inner call is one call that the multisig makes. It has a target address and ABI-encoded calldata.

This call has one inner call: a `Bridge.withdraw` of 0.5 of the native token to an address on the bridged chain. Orderbook calls, for example `submitOrder` or `cancel`, are inner calls in the same way. Their target is the orderbook.

Set the fields of the call as follows:

* `nonce` is the next nonce of the multisig. Read it from the `nonce` field of `GET /v1/multisig/{address}`.
* `validUntil` is the last batch that can run the call. It must not be more than 7 days ahead.
* The `deadline` fields of the inner calls do not limit when they run. Set them to `validUntil`.

Each member signs the `Call` as EIP-712 typed data. The `verifyingContract` of the domain is the address of the multisig. Usually each member signs on a different device, with `eth_signTypedData_v4` in a wallet. Then the member sends the signature to the account that sends `execute`. The [precompile reference](../applications-precompiles/multisig.md#the-signed-call) shows the full typed-data payload.

{% tabs %}
{% tab title="TypeScript (ethers.js)" %}
```typescript
const domain = { name: "pod multisig", version: "1", chainId, verifyingContract: multisig };
const types = {
  Call: [
    { name: "nonce", type: "uint64" },
    { name: "validUntil", type: "uint64" },
    { name: "calls", type: "InnerCall[]" },
  ],
  InnerCall: [
    { name: "target", type: "address" },
    { name: "data", type: "bytes" },
  ],
};

const bridge = new ethers.Interface([
  "function withdraw(address token, address to, uint256 amount, uint128 deadline)",
]);
const validUntil = nowMicros() + 3600n * 1_000_000n; // one hour
const call = {
  nonce: 0n,
  validUntil,
  calls: [{
    target: BRIDGE,
    data: bridge.encodeFunctionData("withdraw", [NATIVE, BRIDGED_CHAIN_RECIPIENT, ethers.parseEther("0.5"), validUntil]),
  }],
};

const signatures = [
  await members[0].signTypedData(domain, types, call),
  await members[1].signTypedData(domain, types, call),
];
```
{% endtab %}

{% tab title="Rust (alloy)" %}
```rust
let domain = eip712_domain! {
    name: "pod multisig",
    version: "1",
    chain_id: chain_id,
    verifying_contract: multisig,
};

let valid_until = now_micros() + 3600 * 1_000_000; // one hour
let call = Multisig::Call {
    nonce: 0,
    validUntil: valid_until,
    calls: vec![Multisig::InnerCall {
        target: BRIDGE,
        data: Bridge::withdrawCall {
            token: NATIVE,
            to: BRIDGED_CHAIN_RECIPIENT,
            amount: one / U256::from(2u64),
            deadline: valid_until.into(),
        }
        .abi_encode()
        .into(),
    }],
};

let mut signatures: Vec<Bytes> = Vec::new();
for member in &members[..2] {
    let signature = member.sign_hash(&call.eip712_signing_hash(&domain)).await?;
    signatures.push(signature.as_bytes().into());
}
```
{% endtab %}
{% endtabs %}

## 4. Execute the call

Any account that has the signatures can send `execute`. If the receipt is a success, the call was authorized and ran. The nonce of the multisig is now 1.

The receipt does not show the result of each inner call. Read the usual outcomes for these results. In this example, the outcome is the withdrawal of the multisig. Its id is the hash of the `execute` transaction.

{% tabs %}
{% tab title="TypeScript (ethers.js)" %}
```typescript
const receipt = await (await multisigPrecompile.execute(multisig, call, signatures)).wait();
console.log("Execute tx:", receipt!.hash);

const activity = await (
  await fetch(`${RPC}/v1/clob/activity/${multisig}?activity_types=multisig_call,bridge_transfer`)
).json();
console.log(JSON.stringify(activity.activity));
// { "<batch>": [ { "k": "bridge_transfer", "tx": "<execute hash>", "amt": "-500000000000000000", ... },
//                { "k": "multisig_call", "tx": "<execute hash>", "nonce": 0, ... } ] }
```
{% endtab %}

{% tab title="Rust (alloy)" %}
```rust
let receipt = precompile
    .execute(multisig, call, signatures)
    .send().await?
    .get_receipt().await?;
println!("Execute tx: {}", receipt.transaction_hash);

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

To claim the withdrawal on the bridged chain, follow [Bridge from Pod](bridge-from-pod.md). Use the hash of the `execute` transaction for the lookup: `GET /v1/bridge/withdrawals/by-id/{execute hash}`.

If the `execute` receipt failed, Pod refused the call. No inner call ran, and the nonce of the multisig did not change. The reason is in the `err` field of the `multisig_call` entry in the activity of the sender. For example, `premature` means that the nonce of the call is higher than the nonce of the multisig. For all reasons, see [Outcomes](../applications-precompiles/multisig.md#outcomes).

## 5. Rotate a member

`setConfig` is an inner call with the address of the multisig as its target. This call replaces the third member with a new member and keeps the threshold at 2. The change applies when the call runs. The next call needs signatures from the new members. The address does not change.

{% tabs %}
{% tab title="TypeScript (ethers.js)" %}
```typescript
const account = new ethers.Interface(["function setConfig(address[] members, uint16 threshold)"]);
const newcomer = new ethers.Wallet(NEWCOMER_PRIVATE_KEY);
const rotated = [members[0].address, members[1].address, newcomer.address]
  .sort((a, b) => (BigInt(a) < BigInt(b) ? -1 : 1));

const rotate = {
  nonce: 1n,
  validUntil: nowMicros() + 3600n * 1_000_000n,
  calls: [{ target: multisig, data: account.encodeFunctionData("setConfig", [rotated, 2]) }],
};
await (await multisigPrecompile.execute(
  multisig,
  rotate,
  [
    await members[0].signTypedData(domain, types, rotate),
    await members[1].signTypedData(domain, types, rotate),
  ],
)).wait();
```
{% endtab %}

{% tab title="Rust (alloy)" %}
```rust
let newcomer: PrivateKeySigner = NEWCOMER_PRIVATE_KEY.parse()?;
let mut rotated = vec![members[0].address(), members[1].address(), newcomer.address()];
rotated.sort();

let rotate = Multisig::Call {
    nonce: 1,
    validUntil: now_micros() + 3600 * 1_000_000,
    calls: vec![Multisig::InnerCall {
        target: multisig,
        data: MultisigAccount::setConfigCall { members: rotated, threshold: 2 }
            .abi_encode()
            .into(),
    }],
};
let mut signatures: Vec<Bytes> = Vec::new();
for member in &members[..2] {
    signatures.push(member.sign_hash(&rotate.eip712_signing_hash(&domain)).await?.as_bytes().into());
}
precompile.execute(multisig, rotate, signatures).send().await?.get_receipt().await?;
```
{% endtab %}
{% endtabs %}

## 6. Cancel a signed call

There is no cancel function. In this example, members signed a call with nonce 2, and that call must not run. To cancel it, run a different call with nonce 2. That call uses the nonce. After it runs, Pod refuses the signed call as `stale_nonce`. Usually the different call has no inner calls:

{% tabs %}
{% tab title="TypeScript (ethers.js)" %}
```typescript
const cancel = { nonce: 2n, validUntil: nowMicros() + 3600n * 1_000_000n, calls: [] };
await (await multisigPrecompile.execute(
  multisig,
  cancel,
  [
    await members[0].signTypedData(domain, types, cancel),
    await newcomer.signTypedData(domain, types, cancel),
  ],
)).wait();
```
{% endtab %}

{% tab title="Rust (alloy)" %}
```rust
let cancel = Multisig::Call { nonce: 2, validUntil: now_micros() + 3600 * 1_000_000, calls: vec![] };
let mut signatures: Vec<Bytes> = Vec::new();
for member in [&members[0], &newcomer] {
    signatures.push(member.sign_hash(&cancel.eip712_signing_hash(&domain)).await?.as_bytes().into());
}
precompile.execute(multisig, cancel, signatures).send().await?.get_receipt().await?;
```
{% endtab %}
{% endtabs %}

The cancel call needs `threshold` signatures from the current members, as all calls do.

For the limits, see [Limits](../applications-precompiles/multisig.md#limits). For all refusal reasons, see [Outcomes](../applications-precompiles/multisig.md#outcomes).
