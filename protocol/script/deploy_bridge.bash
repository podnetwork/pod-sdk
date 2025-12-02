#!/usr/bin/env bash
set -euo pipefail

# Usage:
# ./script/deploy_bridge.bash
# ran from protocol folder to grab the .env file


source .env
# Required env vars
: "${SOURCE_CHAIN_RPC:?}"         # e.g. http://127.0.0.1:8546 or Sepolia RPC
: "${PK_SOURCE_CHAIN:?}"          # Anvil/Sepolia deployer private key
: "${USER_ADDRESS:?}"      # Receiver on Anvil/Sepolia for initial mint
: "${USER_PRIVATE_KEY:?}" # User private key
: "${POD_COMMITTEE_KEYS:?}" # Pod committee keys
: "${POD_BRIDGE_ADDR:?}" # Pod BridgeMintBurn address
: "${POD_TOKEN_ADDR:?}"  # Pod Mirror Token address

echo "SOURCE_CHAIN_RPC: $SOURCE_CHAIN_RPC"
echo "PK_SOURCE_CHAIN: $PK_SOURCE_CHAIN"
echo "USER_ADDRESS: $USER_ADDRESS"
echo "POD_BRIDGE_ADDR: $POD_BRIDGE_ADDR"
echo "POD_TOKEN_ADDR: $POD_TOKEN_ADDR"

# Optional (defaults)
: "${SOURCE_CHAIN_ID:=31337}" # set to 11155111 for Sepolia

# Token params
: "${TOKEN_NAME:=Test Token}"
: "${TOKEN_SYMBOL:=TEST}"
: "${MIRROR_SYMBOL:=pwTEST}"
: "${MIRROR_TOKEN_NAME:=Pod Wrapped Test Token}"
: "${DECIMALS:=18}"
: "${MINT_AMOUNT:=100000000000000000000}"       # 10e18

# Limits
: "${NATIVE_MIN:=10000000000000000}"            # 0.01 ether
: "${NATIVE_DEP:=500000000000000000000}"        # 500e18
: "${NATIVE_CLA:=500000000000000000000}"        # 500e18
: "${TOKEN_MIN:=10000000000000000}"             # 0.01e18
: "${TOKEN_DEP:=1000000000000000000000}"        # 100e18
: "${TOKEN_CLA:=1000000000000000000000}"        # 100e18


# 1) Deploy test ERC20 on Source chain (Anvil/Sepolia) and mint to user
SOURCE_CHAIN_TOKEN_ADDR=$(forge script ./script/DeployToken.s.sol:DeployToken \
  --rpc-url "$SOURCE_CHAIN_RPC" --private-key "$PK_SOURCE_CHAIN" --broadcast --slow \
  --json \
  --sig "run(string,string,uint8,address,uint256)" \
  "$TOKEN_NAME" "$TOKEN_SYMBOL" "$DECIMALS" "$USER_ADDRESS" "$MINT_AMOUNT" \
  | jq -sr 'map(.returns?.token?.value // empty) | map(select(. != "")) | last')
echo "Source chain token: $SOURCE_CHAIN_TOKEN_ADDR"

# Compute addresses for next CREATE
SOURCE_CHAIN_DEPLOYER=$(cast wallet address --private-key "$PK_SOURCE_CHAIN")
SOURCE_CHAIN_NONCE=$(cast nonce "$SOURCE_CHAIN_DEPLOYER" --rpc-url "$SOURCE_CHAIN_RPC")
SOURCE_CHAIN_BRIDGE_ADDR=$(cast compute-address "$SOURCE_CHAIN_DEPLOYER" --nonce "$((SOURCE_CHAIN_NONCE + 3))" |  grep -oE '0x[0-9a-fA-F]{40}')

echo "Precomputed:"
echo "  Source chain BridgeDepositWithdraw -> $SOURCE_CHAIN_BRIDGE_ADDR"
echo "  Pod   BridgeMintBurn               -> $POD_BRIDGE_ADDR"

# 4) Deploy BridgeDepositWithdraw on Source chain (Anvil/Sepolia) and configure a test token, pointing to precomputed Pod bridge address.
forge script ./script/DeployDepositWithdraw.s.sol:DeployDepositWithdraw \
  --rpc-url "$SOURCE_CHAIN_RPC" --private-key "$PK_SOURCE_CHAIN" --broadcast --slow --skip-simulation \
  --sig "run(address,(uint256,uint256,uint256),address,address)" \
  "$POD_BRIDGE_ADDR" "($NATIVE_MIN,$NATIVE_DEP,$NATIVE_CLA)" "$SOURCE_CHAIN_TOKEN_ADDR" "$POD_TOKEN_ADDR" \
  -vvv

# 6) Fund user on Pod and Source chain
# cast send --rpc-url "$POD_RPC" --private-key "$PK_POD" --value "$MINT_AMOUNT" "$USER_ADDRESS"
cast send --rpc-url "$SOURCE_CHAIN_RPC" --private-key "$PK_SOURCE_CHAIN" --value "$MINT_AMOUNT" "$USER_ADDRESS"

# 7) Call approve from user private key on bridge for amount of tokens
# cast send $POD_TOKEN_ADDR "approve(address,uint256)" --rpc-url "$POD_RPC" --private-key "$USER_PRIVATE_KEY" "$POD_BRIDGE_ADDR" "$MINT_AMOUNT"
cast send $SOURCE_CHAIN_TOKEN_ADDR "approve(address,uint256)" --rpc-url "$SOURCE_CHAIN_RPC" --private-key "$USER_PRIVATE_KEY" "$SOURCE_CHAIN_BRIDGE_ADDR" "$MINT_AMOUNT"


# 8) Show codes to confirm deployment when debugging
echo "Codes:"
echo "  Source Chain BridgeDepositWithdraw code bytes: $(cast code $SOURCE_CHAIN_BRIDGE_ADDR --rpc-url $SOURCE_CHAIN_RPC | wc -c)"
echo "  Source Chain Token                 code bytes: $(cast code $SOURCE_CHAIN_TOKEN_ADDR --rpc-url $SOURCE_CHAIN_RPC | wc -c)"

# Expected values:
#   Source Chain BridgeDepositWithdraw code bytes:    26453
#   Source Chain Token                 code bytes:    13225

echo "Done."
echo "Source Chain BridgeDepositWithdraw: $SOURCE_CHAIN_BRIDGE_ADDR"
echo "Pod BridgeMintBurn:                 $POD_BRIDGE_ADDR"
echo "Source Chain Token:                 $SOURCE_CHAIN_TOKEN_ADDR"
echo "Pod Mirror Token:                   $POD_TOKEN_ADDR"
