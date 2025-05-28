## pod-optimistic-auction 

### Build

```shell
forge build
```

### Test

```shell
forge test
```

### Format

```shell
forge fmt
```
### Bindings 

```shell
forge bind --crate-name pod-optimistic-auction --bindings-path ./bindings --alloy-version 0.9.2 --force --no-metadata```

After generating the bindings, add serde dependency to Cargo.toml file in the bindings folder
```toml
serde = { version = "1.0.214", features = ["derive"] }
```

## Usage

To run the optimistic auction example, first navigate to the `optimistic-auction` folder
```shell
cd examples/optimistic-auction
```

Then a local network is needed where the auction will be settled (for example anvil)
```shell
anvil -p 8546
```

Populate the `.env` file with the respective values (an example can be seen in `.env.example`)

Make sure that the accounts corresponding to the `PRIVATE_KEY_1` and `PRIVATE_KEY_2` are funded both on anvil and pod.

For anvil
```shell
cast send <ADDRESS> --value 10ether --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --rpc-url localhost:8546
```

For pod
```shell
cast send <ADDRESS> --value 10ether --private-key <FAUCET_KEY> --rpc-url localhost:8545 --legacy
```

The next step is to deploy the consumer contract on anvil.
```shell
forge script script/PodAuctionConsumerDeployer.s.sol --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --rpc-url localhost:8546 --broadcast
```

After deploying the contract, make sure to update the `.env` file with the contract address. 
The PodAuctionConsumer contract address can be found in the logs when executing the script.


Now the example can be executed by running
```shell
cargo run -- --iteration <i>
```

Where iteration is the i-th time we're executing the program with the same anvil chain running in the background.
