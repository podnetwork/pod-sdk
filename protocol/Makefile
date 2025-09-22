generate:
	forge bind --crate-name pod-protocol --bindings-path ./bindings --alloy-version 1.0.24 --force --no-metadata --select "^BridgeMintBurn$$" --select "^BridgeDepositWithdraw$$" --overwrite

check:
	forge bind --crate-name pod-protocol --bindings-path ./bindings --alloy-version 1.0.24 --force --no-metadata --select "^BridgeMintBurn$$" --select "^BridgeDepositWithdraw$$"



.PHONY: generate
.PHONY: check