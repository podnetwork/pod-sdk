#!/bin/bash

if [ "$#" -lt 3 ]; then
    echo "Usage: $0 --to <to_address> --amount <amount> [--deadline <timestamp>]"
    exit 1
fi
TO_ADDRESS=""
AMOUNT=""
DEADLINE=""

while [[ "$#" -gt 0 ]]; do
    key="$1"
    case $key in
        --to)
            TO_ADDRESS="$2"
            shift 2
            ;;
        --amount)
            AMOUNT="$2"
            shift 2
            ;;
        --deadline)
            DEADLINE="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

if [[ -z "$TO_ADDRESS" || -z "$AMOUNT" ]]; then
    echo "Both --to and --amount arguments must be provided"
    exit 1
fi

declare -a PRIVATE_KEYS=(
    "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba"
    "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e"
    "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356"
    "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97"
    "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6"
)
# Initialize bid counter
BID=1

# Loop through each private key and submit a transaction
for PRIVATE_KEY in "${PRIVATE_KEYS[@]}"; do
    CMD="RPC_URL=\"$RPC_URL\" POD_RPC_URL=\"$POD_RPC_URL\" CONTRACT_ADDRESS=\"$CONTRACT_ADDRESS\" cargo run --release -q --bin send_tx -- \
	--private-key \"$PRIVATE_KEY\" \
	--to \"$TO_ADDRESS\" \
	--amount \"$AMOUNT\" \
	--bid \"$BID\""
    if [[ -n "$DEADLINE" ]]; then
        CMD="$CMD \\
	--deadline \"$DEADLINE\""
    fi
    if ! eval "$CMD"; then
	echo "Failed to submit transaction with private key: $PRIVATE_KEY"
	exit 1
    fi
    BID=$((BID + 1))
done

