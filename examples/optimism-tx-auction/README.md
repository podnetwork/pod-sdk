# Enshrining Rollup-Boost with censorship-resistant auctions on pod.

<img width="1012" height="512" alt="Screenshot 2025-08-22 at 2 55 36 PM" src="https://github.com/user-attachments/assets/db2f3ab9-0dbf-40a7-a922-53c35625b71f" />

L2 sequencers order transactions as they arrive, which leads to [spamming by searchers](https://writings.flashbots.net/mev-and-the-limits-of-scaling) trying to capture MEV (Miner Extractable Value). This spamming wastes the L2 throughput and makes it slower and expensive for normal users. Rollup-Boost addresses this issue by auctioning the transaction ordering based on priority fees. This not only fixes the spam problem but also the protocol to [capture MEV revenue internally](https://www.paradigm.xyz/2024/06/priority-is-all-you-need) instead of leaking it completely to external searchers.

The priority auction takes place within an external builder service that operates inside a Trusted Execution Environment (TEE). The TEE ensures the [privacy of the bids and guarantees correct ordering](https://writings.flashbots.net/introducing-rollup-boost) based on priority fees. However, the external builder has the power to censor bids, rigging the auction results completely.

pod enshrines the Rollup-Boost stack by providing censorship resistance for the priority auctions. Transactions are streamed to a network of nodes, and the TEE builder verifies a certificate issued by the network that guarantees the bid set is complete. The protocol ensures that an adversary needs to control at least 1/3 of the nodes to be able to censor transactions. 

Below is a proof of concept implementation to test the integration of Rollup-Boost with pod for conducting censorship-resistant, verifiable priority auctions. For motivation and further explanation, see: https://www.notion.so/pod-network/L2-transaction-auction-on-pod-21ea9700b29b808caa0feb5330324b81.


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
will be used on pod to pay gas for bidding on the auction contract. To prefund them on pod, run:

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
                                    --pod.rpc-url=wss://rpc.v2.pod.network --pod.enabled --pod.contract-address=<AUCTION CONTRACT ADDRESS> \
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
cargo run -- --contract-address <AUCTION CONTRACT ADDRESS> bid-batch --amount 500
```

You should see output similar to:

```text
Bidding for block 2521 with auction deadline 2025-07-23T08:03:59Z
[2025-07-23T08:03:54Z] TX 0x3c67…c523 from 0x90F7…b906 fee 171604 (pod TX: https://explorer.v2.pod.network/tx/0x9a049f8c3f2a1536789ba372e1c8c18c1e27797a330ebc41581b847168671c2e )
[2025-07-23T08:03:54Z] TX 0x749e…3308 from 0x7099…79C8 fee 178028 (pod TX: https://explorer.v2.pod.network/tx/0xe1066c2656583079a4bfb3813e9fdc11751a7e84c7fac6a200aa58e67c1b6349 )
[2025-07-23T08:03:54Z] TX 0x0a61…2b31 from 0x2361…1E8f fee 74026 (pod TX: https://explorer.v2.pod.network/tx/0x682dd9f2f904b57e8b6ec2813b61cce8c72904bf37187550791c038a1c87e600 )
[2025-07-23T08:03:54Z] TX 0x145d…7b9c from 0x976E…0aa9 fee 39144 (pod TX: https://explorer.v2.pod.network/tx/0xe4ae8a374891bb05762b91015f20db8e01ad3f223f269858965143823250d2b3 )
[2025-07-23T08:03:54Z] TX 0x65b1…9f2a from 0x15d3…6A65 fee 148078 (pod TX: https://explorer.v2.pod.network/tx/0x344cb82a7f9dfff6c3489dc7d48a01faf256d37e842c9d82fe9970b15006fc29 )
[2025-07-23T08:03:54Z] TX 0x638c…a8d7 from 0x9965…A4dc fee 170570 (pod TX: https://explorer.v2.pod.network/tx/0x48cd1b254ff0822e6c8553eb6cfea2f0c97a908a6cebf600f280e121c3cce309 )
[2025-07-23T08:03:54Z] TX 0x20b6…ad38 from 0x14dC…9955 fee 82899 (pod TX: https://explorer.v2.pod.network/tx/0xf753ce29bb26af089c030b770c04b0d2e1ea73af72de515f9d9f5777282c24c9 )
[2025-07-23T08:03:54Z] TX 0x5d6e…85b9 from 0x3C44…93BC fee 140953 (pod TX: https://explorer.v2.pod.network/tx/0x2bd52b38333861b4cad12ad403021b3a37fb79770748321af58877c0e3bdd6a9 )
[2025-07-23T08:03:54Z] TX 0x41a1…7a09 from 0xa0Ee…9720 fee 120221 (pod TX: https://explorer.v2.pod.network/tx/0xe7e27c5516a696492111aa1f33b2f42f7c2704c44b125b2bf96d41bc86569a43 )

Waiting for block 2521 to be built...

[2025-07-23T08:04:01Z]] Block 2521 built. 11 transactions:
TX 0xd251…a56c from 0xDeaD…0001 fee 0
TX 0x749e…3308 from 0x7099…79C8 fee 178028
TX 0x3c67…c523 from 0x90F7…b906 fee 171604
TX 0x638c…a8d7 from 0x9965…A4dc fee 170570
TX 0x65b1…9f2a from 0x15d3…6A65 fee 148078
TX 0x5d6e…85b9 from 0x3C44…93BC fee 140953
TX 0x41a1…7a09 from 0xa0Ee…9720 fee 120221
TX 0x20b6…ad38 from 0x14dC…9955 fee 82899
TX 0x0a61…2b31 from 0x2361…1E8f fee 74026
TX 0x145d…7b9c from 0x976E…0aa9 fee 39144
TX 0xa67a…b8c5 from 0xf39F…2266 fee 0
```

### Bidding single transaction

To bid a single transfer transaction for with a random max priority fee, run:

```bash
cargo run -- --contract-address <AUCTION CONTRACT ADDRESS> bid-transfer  --private-key <PRIVATE KEY FUNDED ON L2> --pod-private-key <PRIVATE KEY FUNDED ON POD> --to <ADDRESS TO SEND TO> --amount <AMOUNT>
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
