#!/usr/bin/env bash
#
# Seed + continuously drive a LOCAL pod devnet CLOB for the example app:
#   - funds two throwaway test accounts (native gas + USD/NVDAx collateral)
#   - posts an initial resting ladder on spot (0x..01) and perp (0x..03)
#   - then LOOPS forever, posting perp orders from the maker account and
#     crossing them, so the order book + the maker's order history live-update
#     over the WebSocket.
#
# Requires: foundry `cast`, `gdate` (coreutils), a devnet with minting enabled.
# PUBLIC throwaway test keys for a local chain only. Ctrl-C to stop.
set -uo pipefail

export ETH_RPC_URL="${ETH_RPC_URL:-http://127.0.0.1:8545}"
INDEXER="${INDEXER:-http://127.0.0.1:8600}"

CLOB=0x50d0000000000000000000000000000000000002
MINT=0x00000000000000000000000000000000000FFFFF
NATIVE=0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE   # pETH gas == USD collateral token
NVDAX=0x0000000000000000000000000000000000000001
SPOT=0x0000000000000000000000000000000000000000000000000000000000000001
PERP=0x0000000000000000000000000000000000000000000000000000000000000003   # BTC/USD

ALICE_KEY=0x6646548e48811090fdebbc52cf1d2d64bd433dee99b1b0d3682feb982ef1d0a9   # maker (default-visible account)
BOB_KEY=0x63b1e87ba338fb7843371e5f25596a6ffd519d2e40d82edba06c1cf4313021a0     # taker
ALICE=$(cast wallet address $ALICE_KEY)
BOB=$(cast wallet address $BOB_KEY)
MINTER=0x$(openssl rand -hex 32)

E=000000000000000000
GAS="--gas-price 1000000000 --priority-gas-price 0"
S="submitOrder(bytes32,int256,uint256,uint8,uint128,uint128,bool,bool)"

deadlines() { NOW=$(( ($(gdate +%s%6N)/500000)*500000 )); DL=$(( NOW + 315360000000000 )); TTL=$(( NOW + 346896000000000 )); }

fund() { # addr
  cast send -q $MINT "mint(address,(address,uint256)[],bool)" "$1" "[($NATIVE,500$E)]" false --private-key $MINTER $GAS
  cast send -q $MINT "mint(address,(address,uint256)[],bool)" "$1" "[($NATIVE,5000000$E),($NVDAX,10000$E)]" true --private-key $MINTER $GAS
}
# place: <book> <signedSize> <price> <key>
place() { cast send -q $CLOB "$S" "$1" "$2"$E "$3"$E 0 $DL $TTL false false --private-key "$4" $GAS >/dev/null 2>&1; }

echo "funding $ALICE and $BOB ..."
fund "$ALICE"; fund "$BOB"; sleep 3
deadlines

echo "initial spot ladder (0x..01) ..."
for p in "5 198" "6 197" "8 196" "10 195"; do set -- $p; place $SPOT  $1 $2 $ALICE_KEY; done
for p in "5 202" "6 203" "8 204" "10 205"; do set -- $p; place $SPOT -$1 $2 $ALICE_KEY; done
place $SPOT 7 205 $BOB_KEY; sleep 2; place $SPOT -7 195 $BOB_KEY

echo "initial perp ladder (0x..03) ..."
for p in "1 49900" "2 49800"; do set -- $p; place $PERP  $1 $2 $ALICE_KEY; done
for p in "1 50100" "2 50200"; do set -- $p; place $PERP -$1 $2 $ALICE_KEY; done

trap 'echo; echo "stopped."; exit 0' INT TERM
echo
echo "=== live loop: maker $ALICE trading the BTC/USD perp (Ctrl-C to stop) ==="
i=0
while true; do
  deadlines
  sp=$(( RANDOM % 6 + 1 )); sz=$(( RANDOM % 3 + 1 ))
  bid=$(( 50000 - sp )); ask=$(( 50000 + sp ))
  place $PERP  $sz $bid $ALICE_KEY      # maker resting long
  place $PERP -$sz $ask $ALICE_KEY      # maker resting short
  if (( i % 2 == 0 )); then
    place $PERP  $sz $ask $BOB_KEY      # taker buys -> fills maker's ask
  else
    place $PERP -$sz $bid $BOB_KEY      # taker sells -> fills maker's bid
  fi
  i=$(( i + 1 ))
  if (( i % 25 == 0 )); then fund "$ALICE"; fund "$BOB"; fi   # top up margin/gas
  printf "\r  tick %-5d  bid %d / ask %d  size %d   " "$i" "$bid" "$ask" "$sz"
  sleep 2
done
