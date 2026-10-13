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

  it("sends the window bounds in micros and the batch limit, and nothing else", async () => {
    const { rest, query } = served({ frames: [], next_cursor: null, solution_now: 1 });
    await rest.activity(ACCOUNT as never, { fromUs: 1_000_000, toUs: 2_000_000, limit: 25 });
    expect(query().get("from")).toBe("1000000");
    expect(query().get("to")).toBe("2000000");
    expect(query().get("limit")).toBe("25");
    expect([...query().keys()].sort()).toEqual(["from", "limit", "to"]);
  });

  it("hands the frames through and reads the cursor as a batch", async () => {
    const frame = { batch: 5_000_000, orders: [], events: [{ k: "transfer", id: "0x03", token: "0x7e", amount: "1700" }] };
    const { rest } = served({ frames: [frame], next_cursor: "5500000", solution_now: 6_000_000 });
    const page = await rest.activity(ACCOUNT as never);
    expect(page.frames).toEqual([frame]);
    expect(page.nextCursorUs).toBe(5_500_000);
    expect(page.solutionNow).toBe(6_000);
  });

  it("reads an exhausted window as no cursor", async () => {
    const { rest } = served({ frames: [], next_cursor: null, solution_now: 1 });
    expect((await rest.activity(ACCOUNT as never)).nextCursorUs).toBeNull();
  });
});
