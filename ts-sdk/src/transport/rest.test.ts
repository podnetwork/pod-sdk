// A REST read that never settles is worse than one that fails: it holds its
// slot in `inflight`, so every retry of that URL joins the hang instead of
// trying again. Cold candle windows on a busy node have hung for tens of
// seconds and then answered in half a second.

import { describe, expect, it } from "vitest";

import { PodRestClient } from "./rest.js";

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

  it("spells the weekly resolution the node's way and sends seconds", async () => {
    let seen = "";
    const rest = clientWith((url: string) => {
      seen = url;
      const body = { resolution: "1w", from_us: 60_000_000, to_us: 120_000_000, step_us: 604_800_000_000,
        solution_now_us: 0, accounts: [], markets: [] };
      return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
    });
    const account = `0x${"11".repeat(20)}` as const;
    const data = await rest.pnlHistoricalData(account, { resolution: "1W", from: 60_000, to: 120_000 });
    expect(seen).toBe(`http://node.test/v1/clob/pnl-history/${account}?resolution=1w&from=60&to=120`);
    expect(data.stepUs).toBe(604_800_000_000);
  });
});
