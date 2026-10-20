// Live: REST through a round-robin "load balancer" over two fullnodes, one of
// them deaf (stuck at an old tick), while the socket sticks to the healthy one.
// Mirrors e2e/src/clob/stale_reads.rs. Run with `npm run test:live` and
// POD_LIVE_RPC_A / POD_LIVE_RPC_B set to the two fullnodes' HTTP RPC URLs.

import { afterAll, describe, expect, it } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

import { PodRestClient, PodTradeClient, type Address, type Balances, type Market, type Order } from "../index.js";
import { buildSubmitOrder, createDelegatedWallet, mint, NATIVE_USD_ADDRESS } from "../write/index.js";

// No @types/node in this package.
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const A = env.POD_LIVE_RPC_A ?? "";
const B = env.POD_LIVE_RPC_B ?? "";
const E18 = 10n ** 18n;

async function call<T>(url: string, method: string, params: unknown[] = []): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = (await res.json()) as { result?: T; error?: { message: string } };
  if (json.error) throw new Error(`${method} on ${url}: ${json.error.message}`);
  return json.result as T;
}

/** A load balancer: every request goes to the next origin; `firstToB` methods' first call goes to B. */
function roundRobin(firstToB: string[] = []) {
  const log: { origin: string; method?: string }[] = [];
  const pending = new Set(firstToB);
  let n = 0;
  let onBody: ((path: string, body: unknown) => void) | undefined;
  const lb = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const method = typeof init?.body === "string" ? (JSON.parse(init.body) as { method?: string }).method : undefined;
    const origin = method && pending.delete(method) ? B : n++ % 2 ? B : A;
    log.push({ origin, method });
    const res = await fetch(new URL(url.pathname + url.search, origin), init);
    if (onBody && res.ok && !method) onBody(url.pathname, await res.clone().json().catch(() => undefined));
    return res;
  }) as typeof fetch;
  return { lb, log, observe: (fn?: typeof onBody) => { onBody = fn; } };
}

async function until<T>(what: string, read: () => Promise<T | undefined> | T | undefined, timeoutMs = 30_000): Promise<T> {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const v = await read();
    if (v !== undefined) return v;
    if (Date.now() > end) throw new Error(`timed out: ${what}`);
    await new Promise((r) => setTimeout(r, 100));
  }
}

const strip = ({ timestampUs: _, ...rest }: Balances) =>
  JSON.stringify(rest, (_k, v: unknown) => (typeof v === "bigint" ? v.toString() : v));

const STATUS_RANK: Record<string, number> = { pending: 0, active: 1 };
const rank = (o: Order) => STATUS_RANK[o.status] ?? 2;

const nonDecreasing = (xs: (number | undefined)[]) =>
  xs.filter((x): x is number => x !== undefined).every((x, i, all) => i === 0 || x >= all[i - 1]!);

describe.skipIf(!A || !B)("load balancer node switch", () => {
  afterAll(async () => { await call(B, "pod_dev_setDeaf", [false]).catch(() => {}); });

  it("never goes back in time when REST lands on a lagging node", async () => {
    const restA = new PodRestClient({ restUrl: `${A}/v1` });
    const restB = new PodRestClient({ restUrl: `${B}/v1` });
    await call(B, "pod_dev_setDeaf", [false]);
    const chainId = Number(await call<string>(A, "eth_chainId"));

    const master = privateKeyToAccount(generatePrivateKey());
    const acct = master.address as Address;
    const { lb, log, observe } = roundRobin();
    await mint({ rpcUrl: A, chainId, to: acct, tokens: [{ token: NATIVE_USD_ADDRESS, amount: 5_000n * E18 }], fetch: lb });
    await until("B has the deposit", async () => {
      const [a, b] = await Promise.all([restA.balances(acct), restB.balances(acct)]);
      return strip(a) === strip(b) && a.cash > 0n ? true : undefined;
    });

    await call(B, "pod_dev_setDeaf", [true]);

    const sockets: WebSocket[] = [];
    class TrackedWebSocket extends WebSocket {
      constructor(url: string | URL) { super(url); sockets.push(this); }
    }
    const client = new PodTradeClient({
      restUrl: `${A}/v1`, wsUrl: A.replace(/^http/, "ws"), rpcUrl: A, fetch: lb,
      WebSocket: TrackedWebSocket, positionResyncMs: 500, reconnect: { maxDelayMs: 1_000 },
    });
    afterAll(() => client.close());

    const market = await until<Market>("a spot market", async () =>
      (await client.markets.ready()).find((m) => m.type === "spot"));
    const tickUs = market.auctionIntervalMs * 1000;

    const positions = client.positions(acct);
    const balances = client.balances(acct);
    const orders = client.orders(acct);
    const book = client.orderbook(market.id);
    const seen = { positions: [] as (number | undefined)[], balances: [] as Balances[], orders: [] as Order[][], book: [] as number[] };
    positions.subscribe(() => { seen.positions.push(positions.get()?.timestampUs); });
    balances.subscribe(() => { const b = balances.get(); if (b) seen.balances.push(b); });
    orders.subscribe(() => { seen.orders.push(orders.get() ?? []); });
    book.subscribe(() => { const ob = book.get(); if (ob) seen.book.push(ob.timeMs); });
    const pre = strip(await balances.ready());

    const walletLb = roundRobin(["eth_getTransactionCount", "eth_sendRawTransaction"]);
    const wallet = await createDelegatedWallet({
      master: acct, chainId, rpcUrl: A, ttlMs: 3_600_000,
      signTypedData: (td) => master.signTypedData(td), fetch: walletLb.lb,
    });
    const placeOrder = () => wallet.submit(buildSubmitOrder({
      orderbookId: market.id, side: "buy", orderType: "limit", price: market.tickPrecision > E18 ? market.tickPrecision : E18,
      size: E18, tickPrecision: market.tickPrecision, auctionIntervalUs: tickUs, deadline: Date.now() + 2 * market.auctionIntervalMs,
    }));
    const txHash = await placeOrder();
    expect(walletLb.log.some((r) => r.origin === B && r.method === "eth_getTransactionCount")).toBe(true);
    expect(walletLb.log.some((r) => r.origin === B && r.method === "eth_sendRawTransaction")).toBe(true);

    await until("the order in the orders resource", () => orders.get()?.find((o) => o.txHash === txHash));
    await until("A three ticks past B", async () => {
      const [a, b] = await Promise.all([restA.positions(acct), restB.positions(acct)]);
      return (a.timestampUs ?? 0) - (b.timestampUs ?? 0) >= 3 * tickUs ? true : undefined;
    });

    // A response older than what the resource holds is one the drop-older check
    // had to discard; with `?timestamp=` in play the node should never send one.
    let drops = 0;
    observe((path, body) => {
      const ts = (body as { timestamp?: number } | undefined)?.timestamp;
      const held = path.includes("/clob/positions/") ? positions.get()?.timestampUs
        : path.includes("/clob/balances/") ? balances.get()?.timestampUs : undefined;
      if (ts !== undefined && held !== undefined && ts < held) drops++;
    });
    for (let i = 0; i < 4; i++) {
      const count = sockets.length;
      sockets.at(-1)!.close();
      await until("the socket reconnects", () =>
        sockets.length > count && sockets.at(-1)!.readyState === WebSocket.OPEN ? true : undefined, 10_000);
      await new Promise((r) => setTimeout(r, market.auctionIntervalMs));
    }

    console.info("node-switch", JSON.stringify({
      restOnB: log.filter((r) => r.origin === B && !r.method).length,
      drops,
      wallet: walletLb.log.map((r) => `${r.method}@${r.origin === B ? "B" : "A"}`),
    }));
    observe(undefined);
    expect(drops, "responses the drop-older check had to discard").toBe(0);
    expect(nonDecreasing(seen.positions)).toBe(true);
    expect(nonDecreasing(seen.balances.map((b) => b.timestampUs))).toBe(true);
    expect(nonDecreasing(seen.book)).toBe(true);
    let placed: Order | undefined;
    for (const snapshot of seen.orders) {
      const now = snapshot.find((o) => o.txHash === txHash);
      if (placed) {
        expect(now, "placed order disappeared").toBeDefined();
        expect(rank(now!)).toBeGreaterThanOrEqual(rank(placed));
      }
      placed = now ?? placed;
    }
    const firstPost = seen.balances.findIndex((b) => strip(b) !== pre);
    expect(firstPost).toBeGreaterThanOrEqual(0);
    expect(seen.balances.slice(firstPost).some((b) => strip(b) === pre), "balances went back to pre-order").toBe(false);

    await call(B, "pod_dev_setDeaf", [false]);
    await placeOrder();
    const target = (await restA.positions(acct)).timestampUs ?? 0;
    await until("B catches up to A", async () => ((await restB.positions(acct)).timestampUs ?? 0) >= target ? true : undefined);
    await until("client balances match A", async () => {
      const [mine, a] = [balances.get(), await restA.balances(acct)];
      return mine && strip(mine) === strip(a) ? true : undefined;
    }, 10_000);
  }, 180_000);
});
