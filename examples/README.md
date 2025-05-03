# Examples 
Example contracts and scripts to demonstrate the SDK usage.

### Build

```shell
$ forge build
```

### Generate bindings 

```shell
$ forge bind --crate-name pod-examples --bindings-path ./bindings --alloy-version 0.9.2 --overwrite --force --no-metadata
```

### Format

```shell
$ forge fmt
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

