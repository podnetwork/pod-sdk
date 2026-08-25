#!/usr/bin/env bash
# Apply a queued waitlist deposit with a relayer-enabled private key, then wait
# for the bridged credit to appear on pod.
#
#   RELAYER_PRIVATE_KEY=0x… ./apply-deposit.sh <deposit_id>
#
# The contract stores only a hash of each deposit, so applyDeposits must be
# called with the exact original values — this looks them up from the deposit's
# WaitingDepositCreated event and replays them verbatim. If the deposit is
# already applied on Arbitrum the send is skipped and only the pod wait runs.
# Defaults target the canary waitlist on Arbitrum One; override via the
# environment.
set -euo pipefail

deposit_id="${1:?usage: RELAYER_PRIVATE_KEY=0x… $0 <deposit_id>}"

ARBITRUM_RPC_URL="${ARBITRUM_RPC_URL:-https://arb1.arbitrum.io/rpc}"
WAITLIST="${WAITLIST:-0xFf767fB682328908a0e49141466b3807D48f3332}"
POD_RPC_URL="${POD_RPC_URL:-https://canary.tokyo.pod.network}"
POD_WAIT_SECS="${POD_WAIT_SECS:-120}"
ZERO32=0x0000000000000000000000000000000000000000000000000000000000000000

pending_hash() {
  cast call --rpc-url "$ARBITRUM_RPC_URL" "$WAITLIST" 'depositHashes(uint256)(bytes32)' "$deposit_id"
}
waitlist_logs() { # $1 = event signature (deposit id is topic 1 on both events)
  cast logs --rpc-url "$ARBITRUM_RPC_URL" --address "$WAITLIST" --from-block 0 --json \
    "$1" "$(cast --to-uint256 "$deposit_id")"
}
# Cumulative deposits credited to the account on pod (WAD). Deposits are the
# only thing that moves it, so "it grew" means the bridge credit landed.
# The indexer serves some numbers as hex, so normalize.
net_deposits() { # $1 = account
  local v
  v=$(curl -sf -m 10 "$POD_RPC_URL/v1/clob/balances/$1" | jq -re '.net_deposits // "0"')
  case "$v" in 0x*) cast --to-dec "$v" ;; *) printf '%s\n' "$v" ;; esac
}
wait_on_pod() { # $1 = account, $2 = value net_deposits must exceed to succeed
  local now deadline=$((SECONDS + POD_WAIT_SECS))
  while :; do
    now=$(net_deposits "$1")
    if [ "$(echo "$now > $2" | bc)" = 1 ]; then
      echo "success: pod net deposits for $1 now $now (was $2)"
      return 0
    fi
    if [ "$SECONDS" -ge "$deadline" ]; then
      echo "timed out after ${POD_WAIT_SECS}s waiting for the pod credit (net deposits still $now)" >&2
      return 1
    fi
    sleep 3
  done
}

# The deposit's original values, from its creation event (also proves it exists).
log=$(waitlist_logs 'WaitingDepositCreated(uint256 indexed depositId, address indexed from, address to, address token, uint256 amount, address callContract, uint256 reserveBalance)')
if [ "$(echo "$log" | jq -re 'length')" = 0 ]; then
  echo "no WaitingDepositCreated event for deposit $deposit_id — no such deposit" >&2
  exit 1
fi
from=$(echo "$log" | jq -re '.[0].topics[2]' | sed 's/^0x000000000000000000000000/0x/')
# data = (to, token, amount, callContract, reserveBalance), one per line;
# awk strips cast's "[1e6]" annotations
{ read -r to; read -r token; read -r amount; read -r call_contract; read -r reserve_balance; } < <(
  cast abi-decode 'x()(address,address,uint256,address,uint256)' "$(echo "$log" | jq -re '.[0].data')" \
  | awk '{print $1}')

# Already applied (or withdrawn)? Skip the Arbitrum send, wait on pod only.
if [ "$(pending_hash)" = "$ZERO32" ]; then
  if [ "$(waitlist_logs 'WaitingDepositApplied(uint256 indexed depositId)' | jq -re 'length')" = 0 ]; then
    echo "deposit $deposit_id was withdrawn, not applied — nothing to wait for" >&2
    exit 1
  fi
  echo "deposit $deposit_id is already applied on Arbitrum — waiting for the pod credit for $to"
  wait_on_pod "$to" 0
  exit
fi

: "${RELAYER_PRIVATE_KEY:?set RELAYER_PRIVATE_KEY to a relayer-enabled private key}"
baseline=$(net_deposits "$to")

echo "Applying deposit $deposit_id: $amount of $token, $from -> $to (callContract $call_contract, reserve $reserve_balance)"
receipt=$(cast send --json \
  --rpc-url "$ARBITRUM_RPC_URL" \
  --private-key "$RELAYER_PRIVATE_KEY" \
  "$WAITLIST" \
  'applyDeposits(address,(uint256,uint256,address,address)[],address,uint256)' \
  "$token" \
  "[($deposit_id,$amount,$from,$to)]" \
  "$call_contract" \
  "$reserve_balance")

tx=$(echo "$receipt" | jq -re '.transactionHash')
if [ "$(echo "$receipt" | jq -re '.status')" != "0x1" ]; then
  echo "tx $tx REVERTED" >&2
  exit 1
fi
echo "tx $tx confirmed in block $(cast --to-dec "$(echo "$receipt" | jq -re '.blockNumber')")," \
  "gas used $(cast --to-dec "$(echo "$receipt" | jq -re '.gasUsed')")"

# Receipt events, decoded where known: the waitlist's applied-marker and the
# ERC-20 transfer moving the USDC out of the waitlist into the bridge.
applied_sig=$(cast keccak 'WaitingDepositApplied(uint256)')
transfer_sig=$(cast keccak 'Transfer(address,address,uint256)')
unpad() { sed 's/^0x000000000000000000000000/0x/' <<<"$1"; }
echo "events:"
while IFS= read -r l; do
  addr=$(echo "$l" | jq -re '.address')
  t0=$(echo "$l" | jq -re '.topics[0]')
  case "$t0" in
    "$applied_sig")
      echo "  WaitingDepositApplied(depositId $(cast --to-dec "$(echo "$l" | jq -re '.topics[1]')"))  [$addr]" ;;
    "$transfer_sig")
      echo "  Transfer($(unpad "$(echo "$l" | jq -re '.topics[1]')") -> $(unpad "$(echo "$l" | jq -re '.topics[2]')"), $(cast --to-dec "$(echo "$l" | jq -re '.data')"))  [$addr]" ;;
    *)
      echo "  $(echo "$l" | jq -re '.topics[0]')  [$addr]" ;;
  esac
done < <(echo "$receipt" | jq -c '.logs[]')

# The on-chain state is the ground truth: the pending hash must be gone now.
if [ "$(pending_hash)" != "$ZERO32" ]; then
  echo "WARNING: tx succeeded but deposit $deposit_id is still pending — it was skipped, not applied" >&2
  exit 1
fi
echo "deposit $deposit_id applied on Arbitrum — waiting for the pod credit for $to"
wait_on_pod "$to" "$baseline"
