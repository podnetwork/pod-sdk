#!/usr/bin/env bash
set -euo pipefail

# Usage:
# ./script/deploy_bridge_deterministic.bash
# ran from protocol folder to grab the .env file

source .env
# Required env vars
: "${SOURCE_CHAIN_RPC:?}"        # e.g. http://127.0.0.1:8546 or Sepolia RPC
: "${PK_SOURCE_CHAIN:?}"         # Anvil/Sepolia deployer private key
: "${POD_REGISTRY_ADDR:?}"       # PodRegistry address
: "${POD_BRIDGE_ADDR:?}"         # Pod BridgeMintBurn address
: "${DETERMINISTIC_FACTORY:?}"   # DeterministicDeployFactory address

# Optional
SALT="${SALT:-0}"

echo "SOURCE_CHAIN_RPC:      $SOURCE_CHAIN_RPC"
echo "POD_REGISTRY_ADDR:     $POD_REGISTRY_ADDR"
echo "POD_BRIDGE_ADDR:       $POD_BRIDGE_ADDR"
echo "DETERMINISTIC_FACTORY: $DETERMINISTIC_FACTORY"
echo "SALT:                  $SALT"

CONSTRUCTOR_ARGS=$(cast abi-encode "constructor(address,address)" "$POD_REGISTRY_ADDR" "$POD_BRIDGE_ADDR")

forge script script/DeterministicDeploy.s.sol:DeterministicDeployScript \
    --sig "run(address,uint256,bytes)" \
    "$DETERMINISTIC_FACTORY" "$SALT" "$CONSTRUCTOR_ARGS" \
    --rpc-url "$SOURCE_CHAIN_RPC" \
    --private-key "$PK_SOURCE_CHAIN" \
    --broadcast

echo "Done."
