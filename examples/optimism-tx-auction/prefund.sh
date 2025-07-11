#!/bin/bash

declare -a PRIVATE_KEYS=(
    "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba"
    "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e"
    "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356"
    "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97"
    "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6"
)

POD_PRIVATE_KEY="0x6df79891f22b0f3c9e9fb53b966a8861fd6fef69f99772c5c4dbcf303f10d901"

# Loop through each private key and fund it on pod
for PRIVATE_KEY in "${PRIVATE_KEYS[@]}"; do
    TO=$(cast wallet address --private-key "$PRIVATE_KEY")
    CMD="cast send $TO --rpc-url \"$POD_RPC_URL\" --private-key \"$POD_PRIVATE_KEY\" --legacy --value 1ether --gas-price 100gwei --gas-limit 1000000 --async"
    echo $CMD

    if ! eval "$CMD"; then
	echo "Failed to submit transaction with private key: $PRIVATE_KEY"
	exit 1
    fi
    BID=$((BID + 1))
done

