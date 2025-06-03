generate:
	forge bind --crate-name pod-optimistic-auction --bindings-path ./bindings --alloy-version 0.12.1 --force --no-metadata --select "^PodAuctionConsumer$$" --overwrite
	@printf '\nserde = { version = "1.0.214", features = ["derive"] }' >> ./bindings/Cargo.toml

check:
	forge bind --crate-name pod-optimistic-auction --bindings-path ./bindings --alloy-version 0.12.1 --force --no-metadata --select "^PodAuctionConsumer$$"

.PHONY: generate
.PHONY: check
