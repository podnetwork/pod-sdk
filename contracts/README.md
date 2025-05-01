### Build

```shell
$ forge build
```

### Generate bindings 

```shell
$ forge bind --crate-name pod-contracts --bindings-path ./bindings --alloy-version v0.9.2 --overwrite 
```

### Format

```shell
$ forge fmt
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

