#!/bin/bash
set -euo pipefail

: "${SOURCE_CHAIN_RPC:?}"
: "${BRIDGE_ADMIN_SECRET:?}"
: "${BRIDGE_PROXY_ADDRESS:?}" # Bridge proxy address from initial deployment

# Merkle root for pending claims from the old hash scheme.
# Set to 0x0 if there are no pending claims.
MERKLE_ROOT=${UPGRADE_MERKLE_ROOT:-0x0000000000000000000000000000000000000000000000000000000000000000}

echo "Upgrading bridge..."
echo "RPC:          $SOURCE_CHAIN_RPC"
echo "Bridge proxy: $BRIDGE_PROXY_ADDRESS"
echo "Merkle root:  $MERKLE_ROOT"

forge script ./script/UpgradeBridge.s.sol:UpgradeBridge \
  --rpc-url "$SOURCE_CHAIN_RPC" \
  --private-key "$BRIDGE_ADMIN_SECRET" \
  --broadcast \
  --slow \
  --sig "run(address,bytes32)" \
  "$BRIDGE_PROXY_ADDRESS" "$MERKLE_ROOT"

echo "Done. Bridge upgraded."
