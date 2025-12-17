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

while IFS= read -r line; do
    # Trim leading whitespace
    line="${line#"${line%%[![:space:]]*}"}"

    if [[ $line =~ ^"claim gas with "([0-9]+)" validators: "([0-9]+)$ ]]; then
        validators="${BASH_REMATCH[1]}"
        gas="${BASH_REMATCH[2]}"
        claim_gas[$validators]=$gas
    fi
done <<< "$OUTPUT"

# Print table
echo "┌────────────┬───────────────┐"
echo "│ Validators │ claim() Gas   │"
echo "├────────────┼───────────────┤"

for v in 4 10 20 50 100; do
    claim=${claim_gas[$v]:-"N/A"}

    if [[ $claim != "N/A" ]]; then
        claim=$(format_number "$claim")
    fi

    printf "│ %10s │ %13s │\n" "$v" "$claim"
done

echo "└────────────┴───────────────┘"
