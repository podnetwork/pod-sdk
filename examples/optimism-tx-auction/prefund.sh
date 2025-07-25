#!/bin/bash
set -eu

PRIVATE_KEYS_FILE="keys.json"
PREFUND_L2=true
PREFUND_POD=true
RPC_URL=${RPC_URL:-"http://localhost:8546"}
POD_RPC_URL=${POD_RPC_URL:-"wss://rpc.v2.pod.network"}

OP_FAUCET_KEY=${OP_FAUCET_KEY:-"0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"}
OP_FAUCET_ADDR=$(cast wallet address --private-key "$OP_FAUCET_KEY")


process_args() {
    local usage="
        This script funds testing private keys with 1 ether each on the pod or L2 network.
        ENV variables this script understands:
          POD_PRIVATE_KEY - The private key used to fund other keys (required when --no-pod isn't set).
          POD_RPC_URL - The RPC URL of the pod network (default $POD_RPC_URL).
          RPC_URL - The RPC URL of the L2 network, only needed with --prefund-l2 (default $RPC_URL).

          Options:
            --keys    - Path to the JSON file containing private keys (default: op_keys.json).
            --no-pod  - Don't fund the keys on the pod network.
            --no-l2   - Don't fund the keys on the L2 network.
            --help    - Show this help message.
    "
    while [ "$#" -gt 0 ]; do
        case "$1" in
            --keys)      PRIVATE_KEYS_FILE="$2"; shift ;;
            --no-pod)    PREFUND_POD=false ;;
            --no-l2)     PREFUND_L2=false ;;
            --help)      echo "$usage" && exit 0 ;;
        esac
        shift
    done

    if [ "$PREFUND_POD" = true ] && [ -z "$POD_PRIVATE_KEY" ]; then
        echo "Environment variable POD_PRIVATE_KEY must be set."
        exit 1
    fi
}

process_args "$@"

# Load PRIVATE_KEYS
if ! PRIVATE_KEYS_JSON=$(cat "$PRIVATE_KEYS_FILE" 2>/dev/null); then
    echo "Error: keys.json file not found!"
    exit 1
fi
mapfile -t PRIVATE_KEYS < <(jq -r '.[]' <<< "$PRIVATE_KEYS_JSON")


if [ "$PREFUND_POD" = true ]; then
    POD_FAUCET_ADDR=$(cast wallet address --private-key "$POD_PRIVATE_KEY")
    for PRIVATE_KEY in "${PRIVATE_KEYS[@]}"; do
        TO=$(cast wallet address --private-key "$PRIVATE_KEY")
        echo "Funding $TO on pod with: $POD_FAUCET_ADDR"
        CMD="cast -q send $TO --rpc-url $POD_RPC_URL --private-key $POD_PRIVATE_KEY --value 1ether --gas-price 100gwei --gas-limit 1000000 --async"
        if ! eval "$CMD"; then
            echo "Failed to submit funding transaction on pod for: $TO"
            exit 1
        fi
    done
fi

if [ "$PREFUND_L2" = true ]; then
    OP_FAUCET_NONCE=$(cast nonce --rpc-url "$RPC_URL" "$OP_FAUCET_ADDR")
    for PRIVATE_KEY in "${PRIVATE_KEYS[@]}"; do
        TO=$(cast wallet address --private-key "$PRIVATE_KEY")
        echo "Funding $TO on L2 with faucet: $OP_FAUCET_ADDR"
        CMD="cast -q send $TO --rpc-url $RPC_URL --nonce $OP_FAUCET_NONCE --private-key $OP_FAUCET_KEY --value 1ether  --gas-limit 1000000 --async"
        if ! eval "$CMD"; then
            echo "Failed to submit funding transaction on OP for: $TO"
            exit 1
        fi
        OP_FAUCET_NONCE=$((OP_FAUCET_NONCE + 1))
    done
fi

