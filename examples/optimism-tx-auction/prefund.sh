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

declare -a PRIVATE_KEYS=(
    # "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
    # "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
    # "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6"
    # "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a"
    # "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba"
    # "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e"
    # "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356"
    # "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97"
    # "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6"
    "0x4be88d4f66c037df278fea5ebc57285b9e0dae556d7ed4a93932fd21da1fa588"
    "0x904dfcf126418bef9f3a7ce60aceb237ab4fc6469c508da01ac8a8bdb6973e9b"
    "0x9850cf7be87d39428ae81c68d90e287eb817c239859ea3a128cdae808306f793"
    "0xb0e94ab208447a63cb02483a6bba73f2ebda3b40b0c9077f8fceec848d1df37c"
    "0xbd081ac2224f448c0786f525050b3bf39b1ae0e326c42b44200e2e9ff3518ef1"
)

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

