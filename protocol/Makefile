generate:
	forge bind --crate-name pod-protocol --bindings-path ./bindings --alloy-version 1.2.1 --force --no-metadata --select "^Bridge$$" --select "^WrappedToken$$" --select "^DepositWaitingList$$" --overwrite

check:
	forge bind --crate-name pod-protocol --bindings-path ./bindings --alloy-version 1.2.1 --force --no-metadata --select "^Bridge$$" --select "^WrappedToken$$" --select "^DepositWaitingList$$"



.PHONY: generate
.PHONY: check
