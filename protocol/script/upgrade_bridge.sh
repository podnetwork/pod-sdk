#!/bin/bash
set -euo pipefail

: "${SOURCE_CHAIN_RPC:?}"
: "${BRIDGE_ADMIN_SECRET:?}"
: "${BRIDGE_PROXY_ADDRESS:?}" # Bridge proxy address from initial deployment

# Code upgrade only (implementation swap; storage, version, and merkle root
# untouched). For a version upgrade / validator rotation, use
# UpdateBridgeValidatorConfig.s.sol driven by pod's scripts/bridge-upgrade.sh.

echo "Upgrading bridge implementation..."
echo "RPC:          $SOURCE_CHAIN_RPC"
echo "Bridge proxy: $BRIDGE_PROXY_ADDRESS"

forge script ./script/UpgradeBridge.s.sol:UpgradeBridge \
  --rpc-url "$SOURCE_CHAIN_RPC" \
  --private-key "$BRIDGE_ADMIN_SECRET" \
  --broadcast \
  --slow \
  --sig "run(address)" \
  "$BRIDGE_PROXY_ADDRESS"

echo "Done. Bridge implementation upgraded."
