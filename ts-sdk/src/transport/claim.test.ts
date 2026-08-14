import { describe, expect, it, vi } from "vitest";
import { toEventSelector } from "viem";

import { CLAIM_TOPIC, fetchClaimStatus, waitForClaim, watchClaims, type ClaimOutcome } from "./claim.js";
import type { Hash } from "../types/public.js";

const ID = `0x${"11".repeat(32)}` as Hash;
const CLAIM_HASH = `0x${"22".repeat(32)}` as Hash;
const L1_TX = `0x${"33".repeat(32)}` as Hash;
const BRIDGE = "0x4444444444444444444444444444444444444444" as const;

/**
 * A fetch stand-in over a per-method script. Each method's queue is consumed in
 * order and its last entry repeats, so a test describes only the transitions it
 * cares about.
 */
function fakeRpc(script: Record<string, unknown[]>) {
  const queues = Object.fromEntries(Object.entries(script).map(([k, v]) => [k, [...v]]));
  const calls: Array<{ method: string; params: unknown }> = [];
  const fetchFn = vi.fn(async (_url: string, init?: { body?: string }) => {
    const req = JSON.parse(init!.body!) as { method: string; params: unknown[] };
    calls.push({ method: req.method, params: req.params[0] });
    const queue = queues[req.method];
    const next = queue && (queue.length > 1 ? queue.shift() : queue[0]);
    return {
      json: async () => {
        if (next === undefined || next === "error") {
          return { jsonrpc: "2.0", id: 1, error: { code: -32000, message: "unavailable" } };
        }
        const asError = (next as { __error?: string }).__error;
        if (asError) return { jsonrpc: "2.0", id: 1, error: { code: -32603, message: asError } };
        return { jsonrpc: "2.0", id: 1, result: next };
      },
    } as Response;
  });
  return { fetchFn, calls };
}

const claimLog = { transactionHash: L1_TX, blockNumber: "0x64" };

/** `GET /bridge/withdrawals/by-id/{id}` — `status` is authoritative, and `proof`
 * is OMITTED rather than null until a certificate exists. */
const detail = (status: string, withProof = status === "claimable") => ({
  ok: true,
  json: async () => ({
    withdrawal: { withdrawal_id: ID, amount: "0x0", timestamp_us: 1 },
    status,
    ...(withProof ? { proof: { claim_hash: CLAIM_HASH } } : {}),
  }),
});

/** Serves the REST by-id route from a queue, and JSON-RPC from `fakeRpc`. */
function fakeAll(details: unknown[], script: Record<string, unknown[]>) {
  const rpcFake = fakeRpc(script);
  const queue = [...details];
  const fetchFn = (async (url: string, init?: { body?: string }) => {
    if (!init?.body) return (queue.length > 1 ? queue.shift() : queue[0]) as Response;
    return (rpcFake.fetchFn as unknown as typeof fetch)(url as string, init as RequestInit);
  }) as unknown as typeof fetch;
  return { fetchFn, calls: rpcFake.calls };
}

const wait = (
  script: Record<string, unknown[]>,
  extra?: { bridge?: `0x${string}`; details?: unknown[] },
) => {
  const { details, ...options } = extra ?? {};
  const { fetchFn, calls } = fakeAll(details ?? [detail("claimable")], script);
  const promise = waitForClaim({
    restUrl: "http://pod/v1",
    claimRpcUrl: "http://l1",
    withdrawalId: ID,
    pollMs: 0,
    timeoutMs: 1_000,
    fetch: fetchFn as unknown as typeof fetch,
    ...options,
  });
  return { promise, calls };
};

describe("CLAIM_TOPIC", () => {
  // The constant is hand-written so the read path doesn't pull in an ABI
  // encoder. This is the guard that keeps it honest: if the event signature in
  // protocol/src/Bridge.sol changes, or the literal is mistyped, this fails.
  it("is the keccak of the bridge's Claim signature", () => {
    expect(CLAIM_TOPIC).toBe(
      toEventSelector("Claim(bytes32,address,address,uint256,address)"),
    );
  });
});

describe("fetchClaimStatus", () => {
  let urls: string[] = [];
  const status = async (response: unknown) => {
    urls = [];
    return fetchClaimStatus("http://pod/v1", ID, {
      fetch: (async (url: string) => {
        urls.push(url);
        return response;
      }) as unknown as typeof fetch,
    });
  };

  // Nothing type-checks a path string against a Rust router, and this one's
  // failure mode is the quiet kind. Dropping `by-id` doesn't 404 — it lands on
  // the three-segment `/bridge/withdrawals/{account}` route with an id in the
  // account slot, which answers with an empty list. The watch reads that as "no
  // certificate yet" and polls until it times out, so a wrong URL is
  // indistinguishable from a withdrawal that never gathered enough signatures.
  it("requests the four-segment by-id route", async () => {
    await status(detail("claimable"));
    expect(urls).toEqual([`http://pod/v1/bridge/withdrawals/by-id/${ID}`]);
  });

  it("reads claimable off `status`, with the hash from the proof", async () => {
    expect(await status(detail("claimable"))).toEqual({ state: "claimable", claimHash: CLAIM_HASH });
  });

  // Terminal, and distinct from pending: refused means nothing was debited, so a
  // caller stops asking and tells the user they can resubmit.
  it("reads refused off `status`", async () => {
    expect(await status(detail("refused"))).toEqual({ state: "refused" });
  });

  it("reads pending off `status`", async () => {
    expect(await status(detail("pending"))).toEqual({ state: "pending" });
  });

  // `proof` is omitted, not null, until a certificate can be assembled — so a
  // claimable status without one is still pending rather than a crash.
  it("stays pending when the proof is absent", async () => {
    expect(await status(detail("claimable", false))).toEqual({ state: "pending" });
  });

  // No outcome row yet — the normal state right after submitting. Terminality is
  // carried only by `status`, never by an HTTP code.
  it("treats a 404 as pending, not terminal", async () => {
    expect(await status({ ok: false, status: 404, json: async () => ({}) })).toEqual({ state: "pending" });
  });

  it("treats a transport failure as pending", async () => {
    const threw = fetchClaimStatus("http://pod/v1", ID, {
      fetch: (async () => { throw new Error("offline"); }) as unknown as typeof fetch,
    });
    expect(await threw).toEqual({ state: "pending" });
  });
});

describe("waitForClaim", () => {
  it("returns the claim transaction once the event appears", async () => {
    const { promise } = wait({
      eth_blockNumber: ["0x2710"],
      eth_getLogs: [[claimLog]],
    });
    expect(await promise).toEqual({ state: "claimed", claimHash: CLAIM_HASH, transactionHash: L1_TX });
  });

  it("gives up terminally on a refused withdrawal, without scanning L1", async () => {
    const { promise, calls } = wait({ eth_blockNumber: ["0x2710"] }, { details: [detail("refused")] });
    expect(await promise).toEqual({ state: "refused" });
    expect(calls.some((c) => c.method === "eth_getLogs")).toBe(false);
  });

  it("waits for the certificate to assemble before scanning", async () => {
    const { promise } = wait(
      { eth_blockNumber: ["0x2710"], eth_getLogs: [[claimLog]] },
      { details: [detail("pending"), detail("claimable")] },
    );
    expect(await promise).toEqual({ state: "claimed", claimHash: CLAIM_HASH, transactionHash: L1_TX });
  });

  // The window is bounded on both ends: it starts a lookback before the current
  // block (an unbounded eth_getLogs is refused or throttled by most endpoints),
  // and it never re-scans a range that already came back clean.
  //
  // Crucially the scan names its own `toBlock` and resumes from exactly that.
  // With `toBlock: "latest"` the node picks the end itself, and any block mined
  // between that choice and a later head read is stepped over for good — which
  // on a 250ms-block chain loses the claim outright a few percent of the time.
  it("scans a closed range and resumes from its own upper bound", async () => {
    const { promise, calls } = wait({
      // Head advances between polls; the second value is read before the second
      // scan, so a correct implementation never leaves a gap between them.
      eth_blockNumber: ["0x2710", "0x2720"],
      eth_getLogs: [[], [claimLog]],
    });
    await promise;
    const scans = calls.filter((c) => c.method === "eth_getLogs")
      .map((c) => c.params as { fromBlock: string; toBlock: string });
    expect(scans[0]?.fromBlock).toBe(`0x${(0x2710 - 5000).toString(16)}`); // tip − lookback
    expect(scans[0]?.toBlock).toBe("0x2710"); // pinned, not "latest"
    expect(scans[1]?.fromBlock).toBe("0x2711"); // exactly one past scan 1's end — no gap
  });

  // A failed query is indistinguishable from an empty one at the call site, so
  // advancing on it would skip the range unread — and the lookback window is
  // precisely the one covering a relayer that claimed before the watch began.
  it("does not advance past a range whose query failed", async () => {
    const { promise, calls } = wait({
      eth_blockNumber: ["0x2710"],
      eth_getLogs: ["error", [claimLog]],
    });
    await promise;
    const scans = calls.filter((c) => c.method === "eth_getLogs")
      .map((c) => (c.params as { fromBlock: string }).fromBlock);
    expect(scans[1]).toBe(scans[0]); // retried the same range, not the next one
  });

  it("narrows the query to the bridge contract when it is known", async () => {
    const { promise, calls } = wait({
      eth_blockNumber: ["0x2710"],
      eth_getLogs: [[claimLog]],
    }, { bridge: BRIDGE });
    await promise;
    const scan = calls.find((c) => c.method === "eth_getLogs")!.params as { address?: string };
    expect(scan.address).toBe(BRIDGE);
  });

  // Matching on the hash rather than the recipient is what makes this exact:
  // `Claim` indexes `to` too, but two same-amount withdrawals to one address
  // would be indistinguishable under that filter.
  it("filters on the claim hash as the second topic", async () => {
    const { promise, calls } = wait({
      eth_blockNumber: ["0x2710"],
      eth_getLogs: [[claimLog]],
    });
    await promise;
    const scan = calls.find((c) => c.method === "eth_getLogs")!.params as { topics: string[] };
    expect(scan.topics).toEqual([CLAIM_TOPIC, CLAIM_HASH]);
  });

  /**
   * A watch that aborts itself the first time `abortOn` is requested — either a
   * JSON-RPC method name (stage 2) or a URL fragment (stage 1, which is a
   * bodyless REST GET and so carries no method to match on).
   */
  const abortingAt = (abortOn: string, script: Record<string, unknown[]>, details?: unknown[]) => {
    const controller = new AbortController();
    const { fetchFn } = fakeAll(details ?? [detail("claimable")], script);
    const wrapped = (async (url: string, init?: { body?: string }) => {
      const method = init?.body
        ? (JSON.parse(init.body) as { method: string }).method
        : String(url);
      if (method.includes(abortOn)) controller.abort();
      return fetchFn(url, init);
    }) as unknown as typeof fetch;
    return waitForClaim({
      restUrl: "http://pod/v1",
      claimRpcUrl: "http://l1",
      withdrawalId: ID,
      pollMs: 5,
      fetch: wrapped,
      signal: controller.signal,
    });
  };

  it("stops when aborted before the claim hash is known", async () => {
    expect(await abortingAt("by-id", { eth_blockNumber: ["0x2710"] }, [detail("pending")]))
      .toEqual({ state: "pending" });
  });

  // The hash is the expensive half to obtain (it waits on the certificate), so
  // an abort after stage 1 hands it back — a caller resuming the watch doesn't
  // have to re-derive it.
  it("reports the claim hash when aborted while scanning for the event", async () => {
    expect(await abortingAt("eth_getLogs", {
      eth_blockNumber: ["0x2710"],
      eth_getLogs: [[]], // never lands
    })).toEqual({ state: "pending", claimHash: CLAIM_HASH });
  });
});

describe("watchClaims", () => {
  const ID2 = `0x${"44".repeat(32)}` as Hash;
  const CLAIM_HASH2 = `0x${"55".repeat(32)}` as Hash;
  const L1_TX2 = `0x${"66".repeat(32)}` as Hash;

  const detailFor = (status: string, claimHash?: Hash) => ({
    ok: true,
    json: async () => ({
      withdrawal: { withdrawal_id: ID, amount: "0x0", timestamp_us: 1 },
      status,
      ...(claimHash ? { proof: { claim_hash: claimHash } } : {}),
    }),
  });

  const logFor = (claimHash: Hash, transactionHash: Hash) => ({
    transactionHash,
    topics: [CLAIM_TOPIC, claimHash],
  });

  /**
   * Answers the REST by-id route FROM THE URL rather than from a queue, so a
   * request for the wrong id cannot be satisfied by the next scripted reply.
   * The queue-shaped double this replaces could not see the route it existed to
   * exercise.
   */
  function fakeFor(details: Record<string, unknown>, script: Record<string, unknown[]>) {
    const rpc = fakeRpc(script);
    const fetchFn = (async (url: string, init?: { body?: string }) => {
      if (init?.body) return (rpc.fetchFn as unknown as typeof fetch)(url, init as RequestInit);
      const id = String(url).split("/").pop()!;
      return (details[id] ?? { ok: false, status: 404, json: async () => ({}) }) as Response;
    }) as unknown as typeof fetch;
    return { fetchFn, calls: rpc.calls };
  }

  const settled = () => {
    const seen: Array<[Hash, ClaimOutcome]> = [];
    return { seen, onSettled: (id: Hash, o: ClaimOutcome) => void seen.push([id, o]) };
  };

  const tick = () => new Promise((r) => setTimeout(r, 10));

  // The whole point of the batch watcher: two withdrawals, ONE log query.
  it("covers every outstanding withdrawal with a single log query", async () => {
    const { fetchFn, calls } = fakeFor(
      { [ID]: detailFor("claimable", CLAIM_HASH), [ID2]: detailFor("claimable", CLAIM_HASH2) },
      {
        eth_blockNumber: ["0x2710"],
        eth_getLogs: [[logFor(CLAIM_HASH, L1_TX), logFor(CLAIM_HASH2, L1_TX2)]],
      },
    );
    const { seen, onSettled } = settled();
    const w = watchClaims({
      restUrl: "http://pod/v1", claimRpcUrl: "http://l1", pollMs: 0,
      fetch: fetchFn as unknown as typeof fetch, onSettled,
    });
    w.add(ID);
    w.add(ID2);
    await tick();
    w.stop();

    expect(new Map(seen)).toEqual(new Map([
      [ID, { state: "claimed", claimHash: CLAIM_HASH, transactionHash: L1_TX }],
      [ID2, { state: "claimed", claimHash: CLAIM_HASH2, transactionHash: L1_TX2 }],
    ]));
    // Both hashes rode one query, and each claim went to its own withdrawal.
    const scans = calls.filter((c) => c.method === "eth_getLogs");
    expect(scans).toHaveLength(1);
    expect((scans[0]!.params as { topics: unknown[] }).topics[1]).toEqual([CLAIM_HASH, CLAIM_HASH2]);
    expect(w.size).toBe(0);
  });

  // Terminal on pod, so it never reaches the claim chain at all.
  it("settles a refused withdrawal without scanning for it", async () => {
    const { fetchFn, calls } = fakeFor({ [ID]: detailFor("refused") }, { eth_blockNumber: ["0x2710"] });
    const { seen, onSettled } = settled();
    const w = watchClaims({
      restUrl: "http://pod/v1", claimRpcUrl: "http://l1", pollMs: 0,
      fetch: fetchFn as unknown as typeof fetch, onSettled,
    });
    w.add(ID);
    await tick();
    w.stop();

    expect(seen).toEqual([[ID, { state: "refused" }]]);
    expect(calls.some((c) => c.method === "eth_getLogs")).toBe(false);
  });

  // The floor is per id, and this is why. W2 sits in stage 1 for several polls
  // while W1 is already claimable, so every scan carries only W1's hash — and a
  // scan that could not have matched W2 must not be allowed to step over the
  // blocks W2 still needs searched. A relayer can claim from a certificate this
  // node has not finished assembling, so those blocks are exactly where W2's
  // Claim lands. Advancing on W1's behalf loses it permanently and silently.
  it("does not advance past blocks a still-unresolved withdrawal needs searched", async () => {
    const details: Record<string, unknown> = {
      [ID]: detailFor("claimable", CLAIM_HASH),
      [ID2]: detailFor("pending"), // W2 has no certificate yet
    };
    const { fetchFn, calls } = fakeFor(details, {
      eth_blockNumber: ["0x2710", "0x2720", "0x2730"],
      eth_getLogs: [[]],
    });
    const { seen, onSettled } = settled();
    const w = watchClaims({
      restUrl: "http://pod/v1", claimRpcUrl: "http://l1", pollMs: 0,
      fetch: fetchFn as unknown as typeof fetch, onSettled,
    });
    w.add(ID);
    w.add(ID2);
    await tick();
    // W2's certificate lands, and its claim was emitted back in the window that
    // passed while it was pending.
    details[ID2] = detailFor("claimable", CLAIM_HASH2);
    await tick();
    w.stop();

    const scans = calls.filter((c) => c.method === "eth_getLogs")
      .map((c) => c.params as { fromBlock: string; topics: unknown[] });
    const withW2 = scans.find((s) => (s.topics[1] as string[]).includes(CLAIM_HASH2));
    expect(withW2, "a scan should eventually carry W2's hash").toBeDefined();
    // The scan that finally looks for W2 must still start at W2's own floor,
    // not at wherever W1's scans had marched the window to.
    expect(BigInt(withW2!.fromBlock)).toBeLessThanOrEqual(0x2710n);
    expect(seen).toEqual([]); // neither has been claimed in this scenario
  });

  // Each id's floor is pinned when it joins, so a later arrival reaches back to
  // its own lookback rather than inheriting wherever the window had reached.
  it("starts the shared query at the oldest floor among outstanding ids", async () => {
    const { fetchFn, calls } = fakeFor(
      { [ID]: detailFor("claimable", CLAIM_HASH), [ID2]: detailFor("claimable", CLAIM_HASH2) },
      { eth_blockNumber: ["0x2710"], eth_getLogs: [[]] },
    );
    const { onSettled } = settled();
    const w = watchClaims({
      restUrl: "http://pod/v1", claimRpcUrl: "http://l1", pollMs: 0,
      fetch: fetchFn as unknown as typeof fetch, onSettled,
    });
    w.add(ID); // no lookback: starts at the tip
    await tick();
    w.add(ID2, { lookbackBlocks: 500 });
    await tick();
    w.stop();

    const froms = calls.filter((c) => c.method === "eth_getLogs")
      .map((c) => BigInt((c.params as { fromBlock: string }).fromBlock));
    expect(froms[0]).toBe(0x2710n); // first scan anchored at the tip
    // Some later scan reaches back below it, rather than only marching forward.
    expect(froms.some((f) => f <= 0x2710n - 500n)).toBe(true);
  });
});
