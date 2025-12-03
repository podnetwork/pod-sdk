#!/usr/bin/env bash
set -euo pipefail

# Required env vars
: "${SOURCE_CHAIN_RPC:?}"         # e.g. http://127.0.0.1:8546 or Sepolia RPC
: "${PK_SOURCE_CHAIN:?}"          # Anvil/Sepolia deployer private key
: "${SOURCE_CHAIN_BRIDGE_ADDR:?}" # Source chain BridgeDepositWithdraw address
: "${POD_MIRROR_TOKEN:?}"         # Pod mirror token address

: "${TOKEN_NAME:=Test Token}"
: "${TOKEN_SYMBOL:=TEST}"
: "${MIRROR_SYMBOL:=pwTEST}"
: "${DECIMALS:=18}"
: "${TOKEN_MIN:=10000000000000000}"             # 0.01e18
: "${TOKEN_DEP:=1000000000000000000000}"        # 100e18
: "${TOKEN_CLA:=1000000000000000000000}"        # 100e18

echo "Deploying test token ${TOKEN_NAME} (${TOKEN_SYMBOL}) on Source chain and whitelisting on BridgeDepositWithdraw at ${SOURCE_CHAIN_BRIDGE_ADDR}"
echo "Configured mirror token: ${POD_MIRROR_TOKEN}"
echo "Token limits - min: ${TOKEN_MIN}, dep: ${TOKEN_DEP}, cla: ${TOKEN_CLA}"

# 1) Deploy test ERC20 on Source chain (Anvil/Sepolia) and mint to user
SOURCE_CHAIN_TOKEN_ADDR=$(forge script ./script/DeployToken.s.sol:DeployToken \
  --rpc-url "$SOURCE_CHAIN_RPC" --private-key "$PK_SOURCE_CHAIN" --broadcast --slow \
  --json \
  --sig "run(string,string,uint8)" \
  "$TOKEN_NAME" "$TOKEN_SYMBOL" "$DECIMALS" \
  | jq -sr 'map(.returns?.token?.value // empty) | map(select(. != "")) | last')

echo "Source chain token: $SOURCE_CHAIN_TOKEN_ADDR"

# 2) Whitelist the token on Source chain
cast send \
  "$SOURCE_CHAIN_BRIDGE_ADDR" "whiteListToken(address,address,(uint256,uint256,uint256))" \
  "$SOURCE_CHAIN_TOKEN_ADDR" "$POD_MIRROR_TOKEN" "($TOKEN_MIN,$TOKEN_DEP,$TOKEN_CLA)" \
  --rpc-url "$SOURCE_CHAIN_RPC" --private-key "$PK_SOURCE_CHAIN"

