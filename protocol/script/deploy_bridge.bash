#!/usr/bin/env bash
set -euo pipefail

# Usage:
# ./script/deploy_bridge.bash
# ran from protocol folder to grab the .env file

source .env
# Required env vars
: "${SOURCE_CHAIN_RPC:?}"   # e.g. http://127.0.0.1:8546 or Sepolia RPC
: "${PK_SOURCE_CHAIN:?}"    # Anvil/Sepolia deployer private key
: "${POD_COMMITTEE_KEYS:?}" # Pod committee keys
: "${POD_BRIDGE_ADDR:?}"    # Pod BridgeMintBurn address

echo "SOURCE_CHAIN_RPC: $SOURCE_CHAIN_RPC"
echo "PK_SOURCE_CHAIN: $PK_SOURCE_CHAIN"
echo "POD_BRIDGE_ADDR: $POD_BRIDGE_ADDR"
echo "POD_COMMITTEE_KEYS: $POD_COMMITTEE_KEYS"

# Deploy BridgeDepositWithdraw on Source chain (Anvil/Sepolia)
OUTPUT=$(forge script ./script/DeployBridge.s.sol:Deploy \
  --rpc-url "$SOURCE_CHAIN_RPC" --private-key "$PK_SOURCE_CHAIN" --broadcast --slow \
  --json \
  --sig "run(address)" \
  "$POD_BRIDGE_ADDR")

SOURCE_CHAIN_BRIDGE_ADDR=$(jq -sr 'map(.returns?.depositWithdraw?.value // empty) | map(select(. != "")) | last' <<< "$OUTPUT")

echo "Done."
echo "Source Chain BridgeDepositWithdraw: $SOURCE_CHAIN_BRIDGE_ADDR"
echo "Pod BridgeMintBurn:                 $POD_BRIDGE_ADDR"
