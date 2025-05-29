generate:
	forge bind --crate-name pod-examples-solidity --bindings-path ./bindings --alloy-version 0.9.2 --force --no-metadata --overwrite
	@printf '\nserde = { version = "1.0.214", features = ["derive"] }' >> ./bindings/Cargo.toml

check:
	forge bind --crate-name pod-examples-solidity --bindings-path ./bindings --alloy-version 0.9.2 --force --no-metadata
.PHONY: generate
.PHONY: check
