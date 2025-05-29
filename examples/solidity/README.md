## pod-examples-solidity 

## Usage

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

### Bind

```shell
forge bind --crate-name pod-examples-solidity --bindings-path ./bindings --alloy-version 0.9.2 --force --no-metadata;
```

After generating the bindings, add serde dependency to Cargo.toml file in the bindings folder
```toml
serde = { version = "1.0.214", features = ["derive"] }
```