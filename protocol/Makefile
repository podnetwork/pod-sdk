generate:
	forge bind --crate-name pod-protocol --bindings-path ./bindings --alloy-version 1.0.24 --force --no-metadata --select "^IBridge$$" --select "^WrappedToken$$" --overwrite

check:
	forge bind --crate-name pod-protocol --bindings-path ./bindings --alloy-version 1.0.24 --force --no-metadata --select "^IBridge$$" --select "^WrappedToken$$"



.PHONY: generate
.PHONY: check
