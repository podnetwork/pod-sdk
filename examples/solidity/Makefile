DESCRIPTION="Bindings for pod Solidity contracts examples"
LICENSE="MIT OR Apache-2.0"
VERSION=0.3.0
CMD=forge bind --crate-name pod-examples-solidity \
    --crate-version ${VERSION} \
    --crate-description ${DESCRIPTION} \
    --crate-license ${LICENSE} \
    --bindings-path ./bindings \
    --alloy-version 1.0.36 \
    --force \
    --no-metadata \
    --skip script

generate:
	@echo "⚙️  Generating Solidity bindings..."
	@${CMD} --overwrite

check:
	@${CMD} >/dev/null 2>&1 || { \
		echo "⚠️  Bindings out of date — regenerating..."; \
		${MAKE} generate; \
	}
	@cargo check

.PHONY: generate check