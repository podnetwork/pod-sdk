generate:
	forge bind --crate-name pod-optimistic-auction --bindings-path ./bindings --alloy-version 1.0.24 --force --no-metadata --select "^PodAuctionConsumer$$" --overwrite

check:
	forge bind --crate-name pod-optimistic-auction --bindings-path ./bindings --alloy-version 1.0.24 --force --no-metadata --select "^PodAuctionConsumer$$"

.PHONY: generate
.PHONY: check
