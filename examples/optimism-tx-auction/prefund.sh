#!/bin/bash

# Display help message when --help or -h is passed
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    printf "Usage: %s\n" "$0"
    printf "\nThis script funds testing private keys with 10 ether each on the pod network.\n"
    printf "\nMake sure to set the following environment variables before running:\n"
    printf "  POD_PRIVATE_KEY - The private key used to fund other keys.\n"
    printf "  POD_RPC_URL - The RPC URL of the pod network.\n"
    exit 0
fi

# Ensure POD_PRIVATE_KEY and POD_RPC_URL are set
if [[ -z "$POD_PRIVATE_KEY" || -z "$POD_RPC_URL" ]]; then
    echo "Environment variables POD_PRIVATE_KEY and POD_RPC_URL must be set."
    exit 1
fi

OP_FAUCET_KEY="0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
OP_FAUCET_ADDR="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"


OP_FAUCET_NONCE=$(cast nonce --rpc-url "$RPC_URL" "$OP_FAUCET_ADDR")

# Load PRIVATE_KEYS from keys.json
if ! PRIVATE_KEYS_JSON=$(cat keys.json 2>/dev/null); then
    echo "Error: keys.json file not found!"
    exit 1
fi
mapfile -t PRIVATE_KEYS < <(jq -r '.[]' <<< "$PRIVATE_KEYS_JSON")

# Loop through each private key and fund it on pod
for PRIVATE_KEY in "${PRIVATE_KEYS[@]}"; do
    TO=$(cast wallet address --private-key "$PRIVATE_KEY")
    CMD="cast -q send $TO --rpc-url $POD_RPC_URL --private-key $POD_PRIVATE_KEY --value 1ether --gas-price 100gwei --gas-limit 1000000 --async"
    if ! eval "$CMD"; then
        echo "Failed to submit funding transaction on pod for: $TO"
        exit 1
    fi
    echo "$TO balance on pod = $(cast balance "$TO" --rpc-url "$POD_RPC_URL")"

    CMD="cast -q send $TO --rpc-url $RPC_URL --nonce $OP_FAUCET_NONCE --private-key $OP_FAUCET_KEY --value 1ether  --gas-limit 1000000 --async"
    if ! eval "$CMD"; then
        echo "Failed to submit funding transaction on OP for: $TO"
        exit 1
    fi
    OP_FAUCET_NONCE=$((OP_FAUCET_NONCE + 1))
done

