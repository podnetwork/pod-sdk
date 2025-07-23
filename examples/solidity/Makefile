generate:
	forge bind --crate-name pod-examples-solidity --bindings-path ./bindings --alloy-version 0.12.1 --force --no-metadata --overwrite --skip script
	@printf '\nserde = { version = "1.0.214", features = ["derive"] }' >> ./bindings/Cargo.toml

check:
	forge bind --crate-name pod-examples-solidity --bindings-path ./bindings --alloy-version 0.12.1 --force --no-metadata --skip script
.PHONY: generate
.PHONY: check
