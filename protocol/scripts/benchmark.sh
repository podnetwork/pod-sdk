#!/bin/bash

# Run BridgeDepositWithdraw benchmarks and display results in a table

set -e

# Format number with thousands separator
format_number() {
    printf "%'d" "$1"
}

echo "Running BridgeDepositWithdraw benchmarks..."
echo ""

# Run forge test and capture output (need -vv for logs)
OUTPUT=$(forge test --match-contract BridgeDepositWithdrawBenchmark -vv 2>&1)

# Extract gas values using grep and awk
declare -A claim_gas
declare -A claim_native_gas

while IFS= read -r line; do
    # Trim leading whitespace
    line="${line#"${line%%[![:space:]]*}"}"

    if [[ $line =~ ^"claim gas with "([0-9]+)" validators: "([0-9]+)$ ]]; then
        validators="${BASH_REMATCH[1]}"
        gas="${BASH_REMATCH[2]}"
        claim_gas[$validators]=$gas
    elif [[ $line =~ ^"claimNative gas with "([0-9]+)" validators: "([0-9]+)$ ]]; then
        validators="${BASH_REMATCH[1]}"
        gas="${BASH_REMATCH[2]}"
        claim_native_gas[$validators]=$gas
    fi
done <<< "$OUTPUT"

# Print table
echo "┌────────────┬───────────────┬─────────────────────┐"
echo "│ Validators │ claim() Gas   │ claimNative() Gas   │"
echo "├────────────┼───────────────┼─────────────────────┤"

for v in 4 10 20 50 100; do
    claim=${claim_gas[$v]:-"N/A"}
    native=${claim_native_gas[$v]:-"N/A"}

    if [[ $claim != "N/A" ]]; then
        claim=$(format_number "$claim")
    fi
    if [[ $native != "N/A" ]]; then
        native=$(format_number "$native")
    fi

    printf "│ %10s │ %13s │ %19s │\n" "$v" "$claim" "$native"
done

echo "└────────────┴───────────────┴─────────────────────┘"
