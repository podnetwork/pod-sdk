#!/usr/bin/env python3
"""
Prove the SDK's account math matches pod's backend to the wei.

Recomputes withdrawable_cash / perps_equity / per-position funding_accrued from
primitives (snapshot {cash, size, entry, entry_funding, funding_accrued} + live
{mark, funding_index} + config {max_leverage, funding_window_us}) using the exact
integer semantics from trading/src/decimal.rs, and diffs against the values the
backend returned in the same /clob/positions response.

Requires the rebuilt indexer (exposes entry_funding + funding_window_us).
Usage: ./verify-account-math.py [account] [indexer_url]
"""
import json, sys, urllib.request

WAD = 10**18
ACCT = sys.argv[1] if len(sys.argv) > 1 else "0x5775fa97A179Af02fC89055D3A4F87aBE8a9198C"
BASE = sys.argv[2] if len(sys.argv) > 2 else "http://127.0.0.1:8600"

def n(x): return int(x, 16) if str(x).startswith("0x") else int(x)
def get(u): return json.load(urllib.request.urlopen(u, timeout=5))
def mul(a, b):                       # Decimal * : trunc toward zero
    p = a * b
    return p // WAD if p >= 0 else -((-p) // WAD)
def mul_floor(a, b):                 # mul_floor: toward -inf
    return (a * b) // WAD            # python // is floor
def mul_div_ceil(a, b, d):           # positive rounds up, negative truncs
    if d <= 0: return 0
    prod = abs(a) * abs(b); q, r = divmod(prod, d)
    neg = (a < 0) ^ (b < 0)
    mag = q + 1 if (not neg and r) else q
    return -mag if neg else mag

pos = get(f"{BASE}/clob/positions/{ACCT}")
mkts = {m["id"]: m for m in get(f"{BASE}/clob/markets")}
stats = {m["orderbook_id"]: m for m in get(f"{BASE}/clob/markets/stats")["markets"]}

native = n(pos["cash"]); funding_live = 0; funding_snap = 0
price_upnl = 0; im = 0; mm = 0
for p in pos["positions"]:
    if p["kind"] != "perp": continue
    ob = p["orderbook_id"]; mkt = mkts[ob]; dyn = stats.get(ob, {})
    lev = int(mkt["max_leverage"]); im_rate = WAD // lev; mm_rate = im_rate // 2
    mark = n(p["mark_price"]); entry = n(p["entry_price"]); size = n(p["size"])
    price_upnl += mul_floor(mark - entry, size)
    sq = mul(abs(size), mark); im += mul(sq, im_rate); mm += mul(sq, mm_rate)
    # funding at the live index (needs the new fields)
    fidx = n(dyn["funding_index"]) if dyn.get("funding_index") is not None else None
    win = int(mkt.get("funding_window_us", 0))
    if fidx is not None and win and "entry_funding" in p:
        f = mul_div_ceil(fidx - n(p["entry_funding"]), size, win * WAD)
    else:
        f = n(p["funding_accrued"])  # fall back to snapshot if fields absent
    funding_live += f; funding_snap += n(p["funding_accrued"])

native += funding_snap                       # back out native cash
cash_wf = native - funding_live
equity = cash_wf + price_upnl
withdrawable = 0 if equity < mm else max(0, equity - im)

def cmp(label, mine, theirs):
    ok = "OK " if mine == theirs else "DIFF"
    print(f"  [{ok}] {label:16} mine={mine}  backend={theirs}")

print(f"account {ACCT}")
cmp("perps_equity", equity, n(pos["perps_equity"]))
cmp("withdrawable", withdrawable, n(pos["withdrawable_cash"]))
print("(diffs are expected only by funding accrued since the snapshot, unless the")
print(" indexer is rebuilt with entry_funding + funding_window_us and the market is live.)")
