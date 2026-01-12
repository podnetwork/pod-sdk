DESCRIPTION="Bindings for pod Solidity contracts examples"
LICENSE="MIT OR Apache-2.0"
VERSION=0.5.0
CMD=forge bind --crate-name pod-examples-solidity \
    --crate-version ${VERSION}\
    --crate-description ${DESCRIPTION}\
    --crate-license ${LICENSE}\
    --bindings-path ./bindings --alloy-version 1.2.1 --force --no-metadata --skip script

generate:
	${CMD} --overwrite
check:
	${CMD}

.PHONY: generate
.PHONY: check

