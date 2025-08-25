# Enshrining Rollup-Boost with censorship-resistant auctions on pod.

<img width="1012" height="512" alt="Screenshot 2025-08-22 at 2 55 36 PM" src="https://github.com/user-attachments/assets/db2f3ab9-0dbf-40a7-a922-53c35625b71f" />

L2 sequencers order transactions as they arrive, which leads to
[spamming by searchers](https://writings.flashbots.net/mev-and-the-limits-of-scaling) trying to capture MEV (Miner
Extractable Value). This spamming wastes the L2 throughput and makes it slower and expensive for normal users.
Rollup-Boost addresses this issue by auctioning the transaction ordering based on priority fees. This not only fixes the
spam problem but also the protocol to
[capture MEV revenue internally](https://www.paradigm.xyz/2024/06/priority-is-all-you-need) instead of leaking it
completely to external searchers.

The priority auction takes place within an external builder service that operates inside a Trusted Execution Environment
(TEE). The TEE ensures the
[privacy of the bids and guarantees correct ordering](https://writings.flashbots.net/introducing-rollup-boost) based on
priority fees. However, the external builder has the power to censor bids, rigging the auction results completely.

pod enshrines the Rollup-Boost stack by providing censorship resistance for the priority auctions. Transactions are
streamed to a network of nodes, and the TEE builder verifies a certificate issued by the network that guarantees the bid
set is complete. The protocol ensures that an adversary needs to control at least 1/3 of the nodes to be able to censor
transactions.

Below is a proof of concept implementation to test the integration of Rollup-Boost with pod for conducting
censorship-resistant, verifiable priority auctions. For motivation and further explanation, see:
https://www.notion.so/pod-network/L2-transaction-auction-on-pod-21ea9700b29b808caa0feb5330324b81.

### Requirements:

- go v1.24+
- rust
- docker
- foundry

To run the example, we need to setup a local development network consisting of L1 and L2 networks and make sure the
auction contract is deployed on pod.

### Running local OP stack devnet

We will use the [builder playground](https://github.com/flashbots/builder-playground) to run the OP stack network
locally.

Install the builder playground with:

```bash
go install github.com/flashbots/builder-playground@870e880ed3fa4624e0f42bdc59b8078c7b550e8b
```

Then, run the builder playground with:

```bash
builder-playground cook opstack --external-builder http://host.docker.internal:4444
```

> [!NOTE] If you get an error
> `Error: unlinkat <HOME>/.playground/devnet/data_validator/validators/logs/validator.log: permission denied`, remove
> the .playground directory: `sudo rm -rf ~/.playground`

We also need to run a custom block builder that will fetch transactions from a pod auction and include them in block,
sorting by the _max priority fee_. Clone the repository and run the builder with:

### Prefunding accounts

For the purpose of demonstation, the CLI has hardcoded few private keys that need to be prefunded. The same accounts
will be used on pod to pay gas for bidding on the auction contract. In case the accounts lack funds, they can be
prefunded with prefund.sh script. To do this, we need an account on pod with some funds. An account can be funded from
devnet faucet on https://faucet.dev.pod.network. Then, run the script with:

```bash
POD_PRIVATE_KEY=<PRIVATE KEY OF A FUNDED ACCOUNT ON POD> POD_RPC_URL=wss://rpc.v2.pod.network ./prefund.sh
```

### Running OP Builder

To run the OP builder, we need to clone the `op-rbuilder` repository and run it with the appropriate parameters.

```bash
git clone -b pod-builder git@github.com:podnetwork/op-rbuilder.git
```

Then, enter the `op-rbuilder` directory and run the builder:

```bash
RUST_LOG="info,client=debug" cargo run -p op-rbuilder --bin op-rbuilder -- node \
                                    --pod.enabled \
                                    --chain $HOME/.playground/devnet/l2-genesis.json \
                                    --http --http.port 2222 \
                                    --authrpc.addr 0.0.0.0 --authrpc.port 4444 --authrpc.jwtsecret $HOME/.playground/devnet/jwtsecret \
                                    --port 30333 --disable-discovery \
                                    --metrics 127.0.0.1:9011 \
                                    --rollup.builder-secret-key ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
                                    --trusted-peers enode://79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8@127.0.0.1:30304
```

> [!NOTE] If you get an error `Error: genesis hash in the storage does not match the specified chainspec`, remove the
> reth directory: `rm ~/.local/share/reth/ -r`

## Bidding L2 transactions on pod auction

To bid the layer 2 transactions on a pod auction, we will use the [CLI](./src/bin/send_tx.rs).

### Bidding batch of transactions

To bid transactions for all the keys for a certain block with random max priority fee, run:

```bash
cargo run -- bid-batch --amount 500
```

You should see output similar to:

```text
💡 Connecting to L2 node at ws://localhost:8547
💡 Connecting to pod node at wss://rpc.v2.pod.network
Bidding for block 124 with auction deadline 2025-08-25T10:53:58Z
[2025-08-25T10:53:53Z] TX 0x7c92…9493 from 0x976E…0aa9 fee 112044933 (pod TX: https://explorer.v2.pod.network/tx/0x84149ef39748af39dc26bcfc395dbeb1d974f5bfdfb5d3e018afe85db8b43de0 )
[2025-08-25T10:53:53Z] TX 0xec4b…0434 from 0x2361…1E8f fee 108186466 (pod TX: https://explorer.v2.pod.network/tx/0xa4469545cb251f4d0cd7721a8907eec2caf93d98795a0f296101fcad80b05132 )
[2025-08-25T10:53:53Z] TX 0x09ef…0cde from 0x14dC…9955 fee 44012549 (pod TX: https://explorer.v2.pod.network/tx/0x40765b0ad665853643596bb8c3d9f94356eef885fec99716845c1658bb0e743d )
[2025-08-25T10:53:53Z] TX 0xfac4…379f from 0x7099…79C8 fee 54600518 (pod TX: https://explorer.v2.pod.network/tx/0x4aac096a98b89869c9a2eee4c6ecf9a406fa554f9638af35c601c507a6e2286b )
[2025-08-25T10:53:53Z] TX 0x2dc8…9e0d from 0x9965…A4dc fee 50482081 (pod TX: https://explorer.v2.pod.network/tx/0xfb7cc9102e02c0a2c791c20701bc3f814080a71b3873a44e4482fffe85ff8356 )
[2025-08-25T10:53:53Z] TX 0x68e4…a8bd from 0x15d3…6A65 fee 41311075 (pod TX: https://explorer.v2.pod.network/tx/0xf521d66818cdd43b3ed1c1ab5e38a1cc687320f88d18189a723772dab39ba5ea )
[2025-08-25T10:53:53Z] TX 0x7f8a…a7a3 from 0xa0Ee…9720 fee 101023612 (pod TX: https://explorer.v2.pod.network/tx/0xf310e37364526f57d4d8f615820fd2d1482a5453220adecb69cbafd0732217d7 )
[2025-08-25T10:53:53Z] TX 0xf67a…bf26 from 0x90F7…b906 fee 45143191 (pod TX: https://explorer.v2.pod.network/tx/0xd13990ed7096d6cd8f56c55bc3e634373ae9f6583c407ad919ee9abcf3cee194 )
[2025-08-25T10:53:53Z] TX 0x536d…e529 from 0x3C44…93BC fee 59001141 (pod TX: https://explorer.v2.pod.network/tx/0x7ca4b499e821a30a1233fa3bdd8f273b0ce8dc20440b722791800d1344d5dfed )

💡 View the auction at https://explorer.v2.pod.network/auctions/0x00000000000000000000000000000000000000000000000000063d2e5f5d3d80/1756119238000000

Waiting for block 124 to be built...

[2025-08-25T10:54:00Z]] Block 124 built. 11 transactions:
TX 0x90b1…e5d3 from 0xDeaD…0001 fee 0
TX 0x7c92…9493 from 0x976E…0aa9 fee 112044933
TX 0xec4b…0434 from 0x2361…1E8f fee 108186466
TX 0x7f8a…a7a3 from 0xa0Ee…9720 fee 101023612
TX 0x536d…e529 from 0x3C44…93BC fee 59001141
TX 0xfac4…379f from 0x7099…79C8 fee 54600518
TX 0x2dc8…9e0d from 0x9965…A4dc fee 50482081
TX 0xf67a…bf26 from 0x90F7…b906 fee 45143191
TX 0x09ef…0cde from 0x14dC…9955 fee 44012549
TX 0x68e4…a8bd from 0x15d3…6A65 fee 41311075
TX 0xf617…ab6e from 0xf39F…2266 fee 0
```

### Bidding single transaction

To bid a single transfer transaction for with a random max priority fee, run:

```bash
cargo run -- bid-transfer  --private-key <PRIVATE KEY FUNDED ON L2> --pod-private-key <PRIVATE KEY FUNDED ON POD> --to <ADDRESS TO SEND TO> --amount <AMOUNT>
```

You should see output similar to:

```text
Bidding for block 84 with auction deadline 2025-07-23T10:24:54Z
[2025-07-23T10:24:50Z] TX 0x2bfb…139b from 0xa0Ee…9720 fee 111501560 (pod TX: https://explorer.v2.pod.network/tx/0xa96c4122320a34592fa6dae293667f92a89662c5be20bf7153dea5f85eddb88e )

Waiting for block 84 to be built...

[2025-07-23T10:24:56Z]] Block 84 built. 3 transactions:
TX 0x486d…6e70 from 0xDeaD…0001 fee 0
TX 0x2bfb…139b from 0xa0Ee…9720 fee 111501560
TX 0xb97c…0cfd from 0xf39F…2266 fee 0
```

Here's a screencast showing all the steps in action: ![screencast](./demo.gif)
