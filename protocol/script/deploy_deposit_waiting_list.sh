#!/bin/bash
set -euo pipefail

# Usage: ./script/deploy_deposit_waiting_list.sh BRIDGE_ADDRESS RELAYER_SECRET BRIDGE_ADMIN_SECRET [TOKEN1 TOKEN2 ...]
# Requires: RPC_URL environment variable

BRIDGE_ADDRESS=${1:?Usage: $0 BRIDGE_ADDRESS RELAYER_SECRET BRIDGE_ADMIN_SECRET [TOKEN1 TOKEN2 ...]}
RELAYER_SECRET=${2:?Usage: $0 BRIDGE_ADDRESS RELAYER_SECRET BRIDGE_ADMIN_SECRET [TOKEN1 TOKEN2 ...]}
BRIDGE_ADMIN_SECRET=${3:?Usage: $0 BRIDGE_ADDRESS RELAYER_SECRET BRIDGE_ADMIN_SECRET [TOKEN1 TOKEN2 ...]}
shift 3
TOKENS=("$@")

RPC_URL=${RPC_URL:?RPC_URL environment variable must be set}

RELAYER_ADDRESS=$(cast wallet address --private-key "$RELAYER_SECRET")
BRIDGE_ADMIN_ADDRESS=$(cast wallet address --private-key "$BRIDGE_ADMIN_SECRET")

echo "Bridge:       $BRIDGE_ADDRESS"
echo "Bridge admin: $BRIDGE_ADMIN_ADDRESS"
echo "Relayer:      $RELAYER_ADDRESS"
echo "Tokens:       ${TOKENS[*]:-none}"

# 1. Deploy DepositWaitingList
echo ""
echo "Deploying DepositWaitingList..."
DEPLOY_OUTPUT=$(forge script ./script/DeployDepositWaitingList.s.sol:DeployDepositWaitingList \
  --rpc-url "$RPC_URL" \
  --private-key "$RELAYER_SECRET" \
  --broadcast \
  --slow \
  --sig "run(address,address)" \
  "$BRIDGE_ADDRESS" "$RELAYER_ADDRESS")

echo "$DEPLOY_OUTPUT"

WAITING_LIST_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep "DepositWaitingList deployed at:" | awk '{print $NF}')
if [ -z "$WAITING_LIST_ADDRESS" ]; then
  echo "Error: failed to extract DepositWaitingList address from deploy output"
  exit 1
fi

echo ""
echo "DepositWaitingList deployed at: $WAITING_LIST_ADDRESS"

# 2. Grant RELAYER_ROLE on Bridge to the DepositWaitingList
echo ""
echo "Granting RELAYER_ROLE on Bridge to DepositWaitingList..."
forge script ./script/GrantRelayerRole.s.sol:GrantRelayerRole \
  --rpc-url "$RPC_URL" \
  --private-key "$BRIDGE_ADMIN_SECRET" \
  --broadcast \
  --slow \
  --sig "run(address,address)" \
  "$BRIDGE_ADDRESS" "$WAITING_LIST_ADDRESS"

# 3. Approve tokens on the DepositWaitingList
for TOKEN in "${TOKENS[@]}"; do
  echo ""
  echo "Approving token $TOKEN on DepositWaitingList..."
  cast send --rpc-url "$RPC_URL" \
    --private-key "$BRIDGE_ADMIN_SECRET" \
    "$WAITING_LIST_ADDRESS" \
    "approveToken(address)" \
    "$TOKEN"
done

echo ""
echo "Done."
echo "DepositWaitingList: $WAITING_LIST_ADDRESS"
