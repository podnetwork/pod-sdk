generate:
	forge bind --crate-name pod-protocol --bindings-path ./bindings --alloy-version 1.2.1 --force --no-metadata --select "^Bridge$$" --select "^WrappedToken$$" --overwrite

check:
	forge bind --crate-name pod-protocol --bindings-path ./bindings --alloy-version 1.2.1 --force --no-metadata --select "^Bridge$$" --select "^WrappedToken$$"



.PHONY: generate
.PHONY: check
