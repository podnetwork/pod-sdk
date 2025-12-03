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

# Limits
: "${NATIVE_MIN:=10000000000000000}"            # 0.01 ether
: "${NATIVE_DEP:=500000000000000000000}"        # 500e18
: "${NATIVE_CLA:=500000000000000000000}"        # 500e18


# Deploy BridgeDepositWithdraw on Source chain (Anvil/Sepolia)
OUTPUT=$(forge script ./script/DeployDepositWithdraw.s.sol:DeployDepositWithdraw \
  --rpc-url "$SOURCE_CHAIN_RPC" --private-key "$PK_SOURCE_CHAIN" --broadcast --slow \
  --json \
  --sig "run(address,(uint256,uint256,uint256))" \
  "$POD_BRIDGE_ADDR" "($NATIVE_MIN,$NATIVE_DEP,$NATIVE_CLA)")

SOURCE_CHAIN_BRIDGE_ADDR=$(jq -sr 'map(.returns?.depositWithdraw?.value // empty) | map(select(. != "")) | last' <<< "$OUTPUT")

echo "Done."
echo "Source Chain BridgeDepositWithdraw: $SOURCE_CHAIN_BRIDGE_ADDR"
echo "Pod BridgeMintBurn:                 $POD_BRIDGE_ADDR"
