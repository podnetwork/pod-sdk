# Precompiles

Pod uses precompiles for enshrined applications and internal protocol operations. Precompiles are built into the protocol rather than deployed as user contracts, so they can access internal state (validator signatures, timestamps, merkle proofs) and execute without contract call overhead.

## Precompile Addresses

| Signature | Address | Description |
| --------- | ------- | ----------- |
| [Orderbook Spot](orderbook-spot.md) | `0x000000000000000000000000000000000000C10B` | Central limit order book for spot markets |
| [Bridge](bridge.md) | `0x000000000000000000000000000000000000C10` | ERC-20 token bridging between Pod and Ethereum |
| Optimistic Auctions |  - | Batch auction primitive for intent settlement (WIP) |
| `recover(bytes32 txHash, uint64 nonce)` | `0x0000000000000000000000000000000004EC0EE4` | Recover a locked account by finalizing the target transaction chain |
| `requireQuorum(boolean)` | `0x4CF3F1637bfEf1534e56352B6ebAae243aF464c3` | Like `require` but passes if supermajority agrees |
| `external_call([uint256, [Transaction,bytes]])` | `0x8712E00C337971f876621faB9326908fdF330d77` | Call a smart contract on another EVM-compatible chain |
| `call_with_state([uint256, Header, EVMCall, EVMState])` | `0xb4bbff8874b41f97535bc8dafbaaff0dc5c72e5a` | Simulate an EVM transaction execution given a particular initial state |

## Interacting with Precompiles

You interact with Pod's precompiles the same way you would interact with any smart contract on Ethereum  - by encoding function calls against a Solidity ABI and sending them via `eth_call` (reads) or `eth_sendRawTransaction` (writes).

### Reading State

Query the deposited balance of a token in the orderbook contract using `eth_call`.

{% tabs %}
{% tab title="JavaScript (ethers.js)" %}
```javascript
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("https://rpc.v1.dev.pod.network");

const ORDERBOOK = "0x000000000000000000000000000000000000C10B";
const abi = ["function getBalance(address token) view returns (uint256)"];
const orderbook = new ethers.Contract(ORDERBOOK, abi, provider);

const USDT = "0x0000000000000000000000000000000000000001";
const balance = await orderbook.getBalance(USDT);
console.log("Balance:", balance.toString());
```
{% endtab %}

{% tab title="Python (web3.py)" %}
```python
from web3 import Web3

w3 = Web3(Web3.HTTPProvider("https://rpc.v1.dev.pod.network"))

ORDERBOOK = "0x000000000000000000000000000000000000C10B"
abi = [{"inputs": [{"name": "token", "type": "address"}],
        "name": "getBalance",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view", "type": "function"}]

orderbook = w3.eth.contract(address=ORDERBOOK, abi=abi)

USDT = "0x0000000000000000000000000000000000000001"
balance = orderbook.functions.getBalance(USDT).call()
print("Balance:", balance)
```
{% endtab %}

{% tab title="Rust (alloy)" %}
```rust
use alloy::{providers::ProviderBuilder, sol};

sol! {
    #[sol(rpc)]
    contract Orderbook {
        function getBalance(address token) public view returns (uint256);
    }
}

#[tokio::main]
async fn main() -> eyre::Result<()> {
    let provider = ProviderBuilder::new()
        .on_http("https://rpc.v1.dev.pod.network".parse()?);

    let orderbook = Orderbook::new(
        "0x000000000000000000000000000000000000C10B".parse()?,
        &provider,
    );

    let usdt: Address = "0x0000000000000000000000000000000000000001".parse()?;
    let balance = orderbook.getBalance(usdt).call().await?;
    println!("Balance: {}", balance._0);

    Ok(())
}
```
{% endtab %}
{% endtabs %}

### Submitting Transactions

Send a signed transaction to place a buy order on the orderbook via `eth_sendRawTransaction`.

{% tabs %}
{% tab title="JavaScript (ethers.js)" %}
```javascript
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("https://rpc.v1.dev.pod.network");
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const ORDERBOOK = "0x000000000000000000000000000000000000C10B";
const abi = [
  `function submitOrder(
    bytes32 orderbookId, int256 volume, uint256 price,
    uint128 deadline, uint128 ttl, bool reduceOnly
  )`
];
const orderbook = new ethers.Contract(ORDERBOOK, abi, signer);

const orderbookId = "0x0000000000000000000000000000000000000000000000000000000000000001";
const volume = ethers.parseEther("1");          // buy 1 unit
const price = ethers.parseEther("5000");        // limit price
const deadline = BigInt(Date.now()) * 1000n;    // now in microseconds
const ttl = 60n * 1_000_000n;                  // 60 seconds in microseconds

const tx = await orderbook.submitOrder(
  orderbookId, volume, price, deadline, ttl, false
);
console.log("Order tx:", tx.hash);
```
{% endtab %}

{% tab title="Python (web3.py)" %}
```python
from web3 import Web3
import time, os

w3 = Web3(Web3.HTTPProvider("https://rpc.v1.dev.pod.network"))
account = w3.eth.account.from_key(os.environ["PRIVATE_KEY"])

ORDERBOOK = "0x000000000000000000000000000000000000C10B"
abi = [{"inputs": [
    {"name": "orderbookId", "type": "bytes32"},
    {"name": "volume", "type": "int256"},
    {"name": "price", "type": "uint256"},
    {"name": "deadline", "type": "uint128"},
    {"name": "ttl", "type": "uint128"},
    {"name": "reduceOnly", "type": "bool"}],
    "name": "submitOrder", "outputs": [],
    "stateMutability": "nonpayable", "type": "function"}]

orderbook = w3.eth.contract(address=ORDERBOOK, abi=abi)

tx = orderbook.functions.submitOrder(
    bytes.fromhex("00" * 31 + "01"),            # orderbook id
    10**18,                                      # volume: buy 1 unit
    5000 * 10**18,                               # limit price
    int(time.time() * 1_000_000),                # deadline in microseconds
    60 * 1_000_000,                              # ttl: 60 seconds
    False,                                       # reduce only
).build_transaction({
    "from": account.address,
    "nonce": w3.eth.get_transaction_count(account.address),
})

signed = account.sign_transaction(tx)
tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
print("Order tx:", tx_hash.hex())
```
{% endtab %}

{% tab title="Rust (alloy)" %}
```rust
use alloy::{
    network::EthereumWallet,
    providers::ProviderBuilder,
    signers::local::PrivateKeySigner,
    sol,
    primitives::{U256, I256, FixedBytes},
};

sol! {
    #[sol(rpc)]
    contract Orderbook {
        function submitOrder(
            bytes32 orderbookId, int256 volume, uint256 price,
            uint128 deadline, uint128 ttl, bool reduceOnly
        ) public;
    }
}

#[tokio::main]
async fn main() -> eyre::Result<()> {
    let signer: PrivateKeySigner = std::env::var("PRIVATE_KEY")?.parse()?;
    let wallet = EthereumWallet::from(signer);

    let provider = ProviderBuilder::new()
        .wallet(wallet)
        .on_http("https://rpc.v1.dev.pod.network".parse()?);

    let orderbook = Orderbook::new(
        "0x000000000000000000000000000000000000C10B".parse()?,
        &provider,
    );

    let now_us = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)?
        .as_micros() as u128;

    let tx = orderbook.submitOrder(
        FixedBytes::left_padding_from(&[1]),     // orderbook id
        I256::from_raw(U256::from(10).pow(U256::from(18))), // buy 1 unit
        U256::from(5000) * U256::from(10).pow(U256::from(18)), // limit price
        now_us,                                   // deadline
        60 * 1_000_000,                          // ttl: 60 seconds
        false,                                    // reduce only
    ).send().await?;

    println!("Order tx: {:?}", tx.tx_hash());
    Ok(())
}
```
{% endtab %}
{% endtabs %}
