# Send transactions in parallel

Pod does not require nonces to execute in order. Each account has a **nonce window**: the lowest nonce that has not executed yet (the `watermark`), plus a bitmap of the 128 nonces from the watermark up that have already executed. You can sign and send any nonce in `[watermark, watermark + 128)` without waiting for the ones before it.

This guide shows how to send many transactions without waiting for each one to execute, and then check that every nonce you used was filled.

## Steps

1. **Read the window.** Fetch the account's nonce window. Any nonce in `[watermark, watermark + 128)` whose bit is not set is free.
2. **Send.** Sign each transaction with the next free nonce and submit it with `pod_sendRawTransaction`. The call returns `successes`, the number of validators that attested the transaction. Once `successes >= n_minus_3f` (from `pod_getCommittee`), you can assume the nonce will be used and move on to the next one.
3. **Wait for receipts.** In parallel, subscribe to `pod_receipts` for your account. A receipt arrives when the transaction's batch executes. Any receipt, `status: true` or `false`, means the nonce has been used.
4. **Reconcile.** After you have filled the window from step 1, read the window again. A nonce you sent that is still not set and has had no receipt for a while is a gap. Fill it by sending a transaction at that nonce again.

Only use nonces in the window that haven't been used before, otherwise the transaction is dropped.

## Endpoints

| Purpose | Endpoint |
|---|---|
| Quorum thresholds | [`pod_getCommittee`](../json-rpc/README.md). Returns `n`, `n_minus_3f`, `n_minus_f`. |
| Submit | [`pod_sendRawTransaction`](../json-rpc/README.md)`(signed_tx, timeout_secs?)`. Returns `{ tx_hash, successes, errors }`. Submit to a full node: a validator node always returns `successes: 0`. |
| Receipts | [`eth_subscribe`](../json-rpc/README.md)`("pod_receipts", { account })`. Sends one frame per batch: `{ timestamp_us, receipts: [{ tx_hash, status }] }`. |
| Nonce window | [`GET /v1/accounts/{address}/nonce-slots`](../rest/README.md), or [`pod_getNonceSlots`](../json-rpc/README.md). |

The nonce-window response is:

```json
{ "watermark": 42, "finalized": "0x5", "solution_now": 1763290000000000 }
```

Bit `i` of `finalized` is set when nonce `watermark + i` has executed. Pass `since` (µs) to make the node wait until it has executed up to that time before answering, for example the `timestamp_us` of the last receipt frame you saw.

## Example

The example sends a list of calls as fast as the window allows, waits for receipts, and fills gaps.

{% tabs %}
{% tab title="TypeScript (ethers.js)" %}
```typescript
import { ethers } from "ethers";

const RPC = "https://rpc.podtestnet.dev";
const REST = `${RPC}/v1`;
const WS = "wss://rpc.podtestnet.dev";
const WINDOW = 128n;
const GAP_AFTER_MS = 10_000;

const provider = new ethers.JsonRpcProvider(RPC);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

type Call = { to: string; data: string; value?: bigint };
type Sent = { call: Call; sentAt: number; tip: bigint };

async function readWindow(since?: bigint) {
  const url = `${REST}/accounts/${wallet.address}/nonce-slots${since ? `?since=${since}` : ""}`;
  const w = await (await fetch(url)).json();
  return { watermark: BigInt(w.watermark), finalized: BigInt(w.finalized) };
}

const isExecuted = (w: { watermark: bigint; finalized: bigint }, nonce: bigint) =>
  nonce < w.watermark || ((w.finalized >> (nonce - w.watermark)) & 1n) === 1n;

export async function sendAll(calls: Call[]) {
  const { chainId } = await provider.getNetwork();
  const fees = await provider.getFeeData();
  const { n_minus_3f } = await provider.send("pod_getCommittee", []);

  const sent = new Map<bigint, Sent>();
  const byHash = new Map<string, bigint>();
  const done = new Set<bigint>();
  let lastTick = 0n;

  const ws = new WebSocket(WS);
  await new Promise((ok) => (ws.onopen = ok));
  ws.onmessage = (msg) => {
    const { params } = JSON.parse(msg.data);
    if (!params?.result?.receipts) return;
    lastTick = BigInt(params.result.timestamp_us);
    for (const r of params.result.receipts) {
      const nonce = byHash.get(r.tx_hash);
      if (nonce !== undefined) done.add(nonce);
    }
  };
  ws.send(JSON.stringify({
    jsonrpc: "2.0", id: 1, method: "eth_subscribe",
    params: ["pod_receipts", { account: wallet.address }],
  }));

  async function send(nonce: bigint, call: Call, tip: bigint) {
    const raw = await wallet.signTransaction({
      type: 2, chainId, nonce: Number(nonce), ...call,
      gasLimit: 1_000_000n,
      maxFeePerGas: fees.maxFeePerGas! + tip,
      maxPriorityFeePerGas: fees.maxPriorityFeePerGas! + tip,
    });
    sent.set(nonce, { call, sentAt: Date.now(), tip });
    byHash.set(ethers.keccak256(raw), nonce);
    const res = await provider.send("pod_sendRawTransaction", [raw, 2]);
    if (res.successes < n_minus_3f && res.errors.length > 0) {
      console.warn(`nonce ${nonce}: ${res.successes} successes`, res.errors);
    }
  }

  let window = await readWindow();
  let next = window.watermark;
  const queue = [...calls];
  const inFlight: Promise<void>[] = [];

  while (queue.length > 0 || done.size < sent.size) {
    while (queue.length > 0 && next < window.watermark + WINDOW) {
      if (!isExecuted(window, next) && !sent.has(next)) {
        inFlight.push(send(next, queue.shift()!, 0n));
      }
      next++;
    }
    await Promise.all(inFlight.splice(0));
    await new Promise((r) => setTimeout(r, 500));

    window = await readWindow(lastTick || undefined);
    for (const [nonce, s] of sent) {
      if (isExecuted(window, nonce)) done.add(nonce);
      else if (!done.has(nonce) && Date.now() - s.sentAt > GAP_AFTER_MS) {
        inFlight.push(send(nonce, s.call, s.tip + 1n));
      }
    }
  }
  ws.close();
}
```
{% endtab %}
{% endtabs %}

* Calls inside one window are sent in parallel, so a window takes about one round trip, not one per transaction.
* A receipt with `status: false` also marks the nonce as used. Check `status` if you need to know whether the call itself succeeded.
* Set `GAP_AFTER_MS` above the time your transactions normally take to execute, so you don't resend ones that are only slow.
