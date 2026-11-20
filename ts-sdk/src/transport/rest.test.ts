// A REST read that never settles is worse than one that fails: it holds its
// slot in `inflight`, so every retry of that URL joins the hang instead of
// trying again. Cold candle windows on a busy node have hung for tens of
// seconds and then answered in half a second.

import { describe, expect, it } from "vitest";

import { PodBehindError, PodRestClient } from "./rest.js";

describe("PodRestClient request timeout", () => {
  const clientWith = (fetchFn: unknown, timeoutMs?: number) =>
    new PodRestClient({ restUrl: "http://node.test/v1", timeoutMs, fetch: fetchFn as typeof fetch });

  it("passes an abort signal with every request", async () => {
    let seen: AbortSignal | undefined;
    const rest = clientWith((_url: string, init?: RequestInit) => {
      seen = init?.signal ?? undefined;
      return Promise.resolve(new Response(JSON.stringify({ solution_now: 1 }), { status: 200 }));
    });
    await rest.status();
    expect(seen).toBeInstanceOf(AbortSignal);
  });

  it("fails a request that never settles, rather than hanging", async () => {
    const rest = clientWith(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        }),
      20,
    );
    await expect(rest.status()).rejects.toThrow();
  });
});

describe("PodRestClient.activity", () => {
  const ACCOUNT = "0xa1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1";
  const served = (body: unknown) => {
    let url = "";
    const rest = new PodRestClient({
      restUrl: "http://node.test/v1",
      fetch: ((u: string) => {
        url = u;
        return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
      }) as unknown as typeof fetch,
    });
    return { rest, query: () => new URL(url).searchParams };
  };

  it("sends the types, the window in micros and the limit, and nothing else", async () => {
    const { rest, query } = served({ activity: {}, next: null, solution_now: 1 });
    await rest.activity(ACCOUNT as never, {
      types: ["transfer", "order", "cancel_reject"], fromUs: 1_000_000, toUs: 2_000_000, limit: 25,
    });
    expect(Object.fromEntries(query())).toEqual({
      activity_types: "transfer,order,cancel_reject",
      from: "1000000",
      to: "2000000",
      limit: "25",
    });
  });

  it("omits an empty type list rather than asking for nothing", async () => {
    const { rest, query } = served({ activity: {}, next: null, solution_now: 1 });
    await rest.activity(ACCOUNT as never, { types: [] });
    expect(query().get("activity_types")).toBeNull();
  });

  it("orders the batches newest first and reads the next bound", async () => {
    const transfer = { k: "transfer", id: "0x03", cp: "0x7f", tok: "0x7e", amt: "1700" };
    const { rest } = served({
      activity: { "900000": [transfer], "10000000": [transfer], "5000000": [transfer, transfer] },
      next: "899999",
      solution_now: 12_000_000,
    });
    const page = await rest.activity(ACCOUNT as never);
    expect(page.batches.map(([b, e]) => [b, e.length])).toEqual([[10_000_000, 1], [5_000_000, 2], [900_000, 1]]);
    expect(page.nextUs).toBe(899_999);
    expect(page.solutionNow).toBe(12_000);
  });

  it("reports an exhausted window as a null next", async () => {
    const { rest } = served({ activity: {}, next: null, solution_now: 1 });
    expect((await rest.activity(ACCOUNT as never)).nextUs).toBeNull();
  });
});

describe("PodRestClient.orders", () => {
  it("decodes a row without nested fills, ignoring an old server's", async () => {
    const row = {
      order_id: "0x01", tx_hash: "0x02", bidder: "0xa1", nonce: 1, kind: "user_signed", order_type: "limit",
      status: "filled", price: "0x0", initial_size: "1", filled_base_amount: "0x1", filled_quote_amount: "0x0",
      fee: "0x0", deadline: 1, end: 1,
      fills: [{ base_amount: "1", quote_amount: "0", timestamp: 1, price: "0" }],
    };
    const rest = new PodRestClient({
      restUrl: "http://node.test/v1",
      fetch: (() => Promise.resolve(new Response(
        JSON.stringify({ orders: [row], next_cursor: null, total_count: 1, solution_now: 1_000 }), { status: 200 },
      ))) as unknown as typeof fetch,
    });
    const [order] = (await rest.orders("0xa1" as never)).orders;
    expect(order).toMatchObject({ id: "0x01", status: "filled", filledBase: 1n });
    expect(order).not.toHaveProperty("fills");
  });
});

describe("PodRestClient.bridgeWithdrawals", () => {
  const clientWith = (reply: (url: URL) => Response) => {
    const urls: URL[] = [];
    const rest = new PodRestClient({
      restUrl: "http://node.test/v1",
      fetch: (async (url: string) => { urls.push(new URL(url)); return reply(new URL(url)); }) as unknown as typeof fetch,
    });
    return { rest, urls };
  };

  it("reads the v2 object body with the minimum timestamp", async () => {
    const { rest, urls } = clientWith(() => new Response(JSON.stringify({ withdrawals: [], timestamp: 7_000 })));
    await expect(rest.bridgeWithdrawals("0xabc", { since: 5 }, 6_000))
      .resolves.toEqual({ withdrawals: [], timestampUs: 7_000 });
    expect(urls.map((u) => u.pathname)).toEqual(["/v2/bridge/withdrawals/0xabc"]);
    expect(urls[0]!.searchParams.get("timestamp")).toBe("6000");
  });

  it("reports a v2 node behind the minimum", async () => {
    const { rest, urls } = clientWith(() =>
      new Response(JSON.stringify({ timestamp: 1_500 }), { status: 503, headers: { "retry-after": "1" } }));
    await expect(rest.bridgeWithdrawals("0xabc", undefined, 2_000)).rejects.toBeInstanceOf(PodBehindError);
    expect(urls).toHaveLength(1);
  });
});

describe("PodRestClient minimum timestamp", () => {
  it("sends the minimum as ?timestamp= and reports a node that cannot reach it", async () => {
    const urls: string[] = [];
    const rest = new PodRestClient({
      restUrl: "http://node.test/v1",
      fetch: (async (url: string) => {
        urls.push(url);
        return new Response(JSON.stringify({ timestamp: 1_500 }), { status: 503, headers: { "retry-after": "2" } });
      }) as unknown as typeof fetch,
    });
    const err = await rest.positions("0xabc", 2_000).catch((e: unknown) => e);
    expect(new URL(urls[0]!).searchParams.get("timestamp")).toBe("2000");
    expect(err).toBeInstanceOf(PodBehindError);
    expect(err).toMatchObject({ name: "PodBehindError", currentUs: 1_500, retryAfterMs: 2_000 });
  });
});

describe("PodRestClient v2 order routes", () => {
  const ACCOUNT = "0xa1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1";
  const ID = `0x${"11".repeat(32)}`;
  const v1Order = {
    kind: "user_signed", order_id: ID, tx_hash: `0x${"00".repeat(32)}`, bidder: ACCOUNT, nonce: 1,
    order_type: "limit", status: "expired", price: "100", initial_size: "-5", filled_base_amount: "2",
    filled_quote_amount: "200", fee: "0", deadline: 1_000_000, end: 9_000_000, included_batch: 1_000_000,
    effective_price: "100", fills: [],
  };
  const { price, initial_size, effective_price, end, fills, ...shared } = v1Order;
  const v2Order = {
    ...shared, deadline: "1000000", included_batch: "1000000", limit_price: price, size: initial_size,
    avg_fill_price: effective_price, expires_at: String(end), details: "ttl",
  };
  const page = (orders: unknown[]) => ({ orders, next_cursor: null, total_count: orders.length, solution_now: 1 });
  const node = (hasV2: boolean) => {
    const paths: string[] = [];
    const rest = new PodRestClient({
      restUrl: "http://node.test/v1",
      fetch: ((u: string) => {
        const url = new URL(u);
        paths.push(url.pathname + url.search);
        if (url.pathname.startsWith("/v2/") && !hasV2) return Promise.resolve(new Response("", { status: 404 }));
        const body = url.pathname.startsWith("/v2/") ? page([v2Order]) : page([v1Order]);
        return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
      }) as unknown as typeof fetch,
    });
    return { rest, paths };
  };

  it("decodes a v2 order into the order a v1 row gives, plus details", async () => {
    const [v2] = (await node(true).rest.orders(ACCOUNT as never)).orders;
    const [v1] = (await node(false).rest.orders(ACCOUNT as never)).orders;
    expect(v2).toEqual({ ...v1, details: "ttl" });
    expect(v2!.initialSize).toBe(-5n);
    expect(v2!.endMs).toBe(9_000);
  });

  it("asks v2 first and remembers a node that has only v1", async () => {
    const { rest, paths } = node(false);
    await rest.orders(ACCOUNT as never);
    await rest.activity(ACCOUNT as never).catch(() => undefined);
    expect(paths.map((p) => p.split("?")[0])).toEqual([
      `/v2/clob/orders/${ACCOUNT}`, `/v1/clob/orders/${ACCOUNT}`, `/v1/clob/activity/${ACCOUNT}`,
    ]);
    expect(rest.ordersV1Only).toBe(true);
  });

  it("fetches one order by id", async () => {
    const { rest, paths } = node(true);
    expect((await rest.order(ACCOUNT as never, ID as never))?.details).toBe("ttl");
    expect(paths).toEqual([`/v2/clob/orders/${ACCOUNT}?order_id=${ID}`]);
    expect(await node(true).rest.order(ACCOUNT as never, `0x${"22".repeat(32)}` as never)).toBeUndefined();
  });

  it("maps details to rejectReason only on an invalid order", async () => {
    const { rest } = node(true);
    const [expired] = (await rest.orders(ACCOUNT as never)).orders;
    expect(expired!.rejectReason).toBeUndefined();
  });
});
