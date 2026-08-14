// The withdrawals resource: REST backfill + live stream merged into one list.
//
// Worth pinning because none of it is reachable from `typecheck`: the paging
// cursor, the dedupe between the two surfaces, and the ordering are all runtime
// behaviour over data that type-checks either way.

import { describe, expect, it, onTestFinished, vi } from "vitest";

import { withdrawalsSource } from "./withdrawals.js";
import { BaseResource } from "../stores/resource.js";
import { PodWsClient, type WebSocketCtor } from "../transport/ws.js";
import type { PodRestClient } from "../transport/rest.js";
import type { SyncContext } from "./sources.js";
import type { Address, Hash, Withdrawal, WithdrawalsQuery } from "../types/public.js";
import type { WireWithdrawal } from "../types/wire.js";

type Json = Record<string, unknown>;

const ACCOUNT = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Address;
const TO = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as Address;
const TOKEN = "0xcccccccccccccccccccccccccccccccccccccccc" as Address;

class FakeSocket {
  static last: FakeSocket | undefined;
  sent: Json[] = [];
  onopen?: () => void;
  onmessage?: (ev: { data: string }) => void;
  onclose?: () => void;
  constructor(_url: string) {
    FakeSocket.last = this;
    setTimeout(() => this.onopen?.(), 0);
  }
  send(raw: string): void { this.sent.push(JSON.parse(raw) as Json); }
  close(): void { this.onclose?.(); }
}

const flush = () => new Promise((r) => setTimeout(r, 0));

const id = (n: number) => `0x${n.toString(16).padStart(64, "0")}` as Hash;

const outcome = (n: number, timeUs: number): Withdrawal => ({
  id: id(n),
  withdrawer: ACCOUNT,
  to: TO,
  token: TOKEN,
  amount: 1_000_000_000_000_000_000n,
  timeUs,
});

/** The wire form of an outcome, as `pod_withdrawals` pushes it. */
const wire = (n: number, timeUs: number): WireWithdrawal => ({
  withdrawal_id: id(n),
  withdrawer: ACCOUNT,
  to: TO,
  token: TOKEN,
  amount: "0xde0b6b3a7640000", // 1e18
  timestamp_us: timeUs,
});

/**
 * A started resource over a scripted REST backend. `pages` is consumed one call
 * at a time, so a test can describe a multi-page backfill; `calls` records the
 * cursor each call was made with.
 */
async function started(pages: Withdrawal[][]) {
  const calls: WithdrawalsQuery[] = [];
  const remaining = [...pages];
  const rest = {
    bridgeWithdrawals: vi.fn(async (_account?: Address, q?: WithdrawalsQuery) => {
      calls.push(q ?? {});
      return remaining.shift() ?? [];
    }),
  } as unknown as PodRestClient;

  const ws = new PodWsClient({
    wsUrl: "ws://test",
    WebSocket: FakeSocket as unknown as WebSocketCtor,
    idleTimeoutMs: 60 * 60_000,
  });
  onTestFinished(() => ws.close());

  const ctx = { rest, ws, positionResyncMs: 0, marketResyncMs: 0 } as SyncContext;
  const resource = new BaseResource(withdrawalsSource(ctx, ACCOUNT));
  onTestFinished(() => resource.destroy());
  resource.subscribe(() => {});
  await flush();
  await flush();

  /** Deliver a `pod_withdrawals` frame the way the server would. */
  const push = async (items: ReturnType<typeof wire>[]) => {
    const socket = FakeSocket.last!;
    const req = socket.sent.find((m) => m.method === "eth_subscribe");
    const subId = "0xsub1";
    socket.onmessage?.({
      data: JSON.stringify({ jsonrpc: "2.0", id: req?.id, result: subId }),
    });
    await flush();
    socket.onmessage?.({
      data: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_subscription",
        params: { subscription: subId, result: items },
      }),
    });
    await flush();
  };

  return { resource, calls, rest, push };
}

describe("withdrawalsSource", () => {
  it("seeds from REST without waiting for the socket", async () => {
    const { resource } = await started([[outcome(1, 5_000)]]);
    expect(resource.get()?.map((w) => w.id)).toEqual([id(1)]);
  });

  // Live-only, with no `since`. This is a replay channel: the server accepts a
  // cursor only while its buffer still reaches back that far, and `since: 0`
  // never does — sending it would fail every subscribe and spend the retry
  // budget on a self-inflicted rejection. History comes from REST regardless.
  it("subscribes live-only until a real cursor exists", async () => {
    await started([[]]);
    const req = FakeSocket.last!.sent.find((m) => m.method === "eth_subscribe");
    expect(req?.params).toEqual(["pod_withdrawals", { account: ACCOUNT }]);
  });

  // An account with no withdrawals still has to reach a defined empty list. Left
  // undefined, every consumer stays on "not loaded yet" and mistakes the first
  // live outcome for its initial snapshot — swallowing a first-ever withdrawal.
  it("publishes an empty list when there is no history", async () => {
    const { resource } = await started([[]]);
    expect(resource.get()).toEqual([]);
  });

  // The paging cursor must be local to the run: a live push moves the shared one,
  // and a page issued after that would start past the rest of an older tick —
  // rows the forward-only cursor could never return for.
  it("keeps paging an older tick after a live push moves the shared cursor", async () => {
    const full = Array.from({ length: 500 }, (_, i) => outcome(i + 1, 5_000));
    const { calls, push } = await started([full, [outcome(501, 5_000)]]);
    await push([wire(900, 9_000)]); // newer tick arrives mid-backfill
    expect(calls[1]).toEqual({ since: 5_000, sinceId: id(500), limit: 500 });
  });

  // A tick can hold more outcomes than one page, so paging on the deadline alone
  // would re-serve the tick's earlier rows or skip its later ones. The cursor is
  // (since, since_id) and the second call has to carry both.
  it("pages a full response using the mid-tick cursor", async () => {
    const full = Array.from({ length: 500 }, (_, i) => outcome(i + 1, 5_000));
    const { resource, calls } = await started([full, [outcome(501, 9_000)]]);

    expect(calls[0]).toEqual({ since: 0, sinceId: undefined, limit: 500 });
    expect(calls[1]).toEqual({ since: 5_000, sinceId: id(500), limit: 500 });
    expect(resource.get()).toHaveLength(501);
  });

  // A short page means the log is exhausted, so the pass stops there. The second
  // call is the re-seed the socket's `open` triggers (the same cold-start
  // duplicate `seedNowAndOnReconnect` documents) — and it resumes from the
  // advanced cursor rather than replaying from the start.
  it("stops paging on a short page and resumes from the cursor", async () => {
    const { calls } = await started([[outcome(1, 5_000)]]);
    expect(calls[0]).toEqual({ since: 0, sinceId: undefined, limit: 500 });
    expect(calls[1]).toEqual({ since: 5_000, sinceId: id(1), limit: 500 });
  });

  // The same outcome can arrive on both surfaces — a reconnect backfill overlaps
  // whatever the stream already delivered. Terminal outcomes are immutable, so
  // the merge is by id and the duplicate must vanish rather than double up.
  it("dedupes an outcome delivered by both REST and the stream", async () => {
    const { resource, push } = await started([[outcome(1, 5_000)]]);
    await push([wire(1, 5_000)]);
    expect(resource.get()?.map((w) => w.id)).toEqual([id(1)]);
  });

  it("merges live outcomes newest-first", async () => {
    const { resource, push } = await started([[outcome(1, 5_000)]]);
    await push([wire(2, 9_000), wire(3, 7_000)]);
    expect(resource.get()?.map((w) => w.id)).toEqual([id(2), id(3), id(1)]);
  });

  it("carries a failure reason through from the stream", async () => {
    const { resource, push } = await started([[]]);
    await push([{ ...wire(1, 5_000), error: "not_included" }]);
    expect(resource.get()?.[0]?.error).toBe("not_included");
  });

  // A backfill that fails while the stream is still feeding a usable list should
  // not blank the UI — only a resource with nothing at all to show reports it.
  it("does not fail the resource when it already holds outcomes", async () => {
    const { resource, push } = await started([[outcome(1, 5_000)]]);
    await push([wire(2, 9_000)]);
    expect(resource.error).toBeUndefined();
    expect(resource.get()).toHaveLength(2);
  });

  // The app ships ahead of the fleet, so a node that has never heard of this
  // channel is an expected state, not a bug. Retrying it forever would be a
  // request every 30s for the life of the tab.
  it("stops resubscribing after a run of rejections", async () => {
    vi.useFakeTimers();
    onTestFinished(() => { vi.useRealTimers(); });

    const rest = { bridgeWithdrawals: vi.fn(async () => []) } as unknown as PodRestClient;
    const ws = new PodWsClient({
      wsUrl: "ws://test",
      WebSocket: FakeSocket as unknown as WebSocketCtor,
      idleTimeoutMs: 60 * 60_000,
    });
    onTestFinished(() => ws.close());
    const ctx = { rest, ws, positionResyncMs: 0, marketResyncMs: 0 } as SyncContext;
    const resource = new BaseResource(withdrawalsSource(ctx, ACCOUNT));
    onTestFinished(() => resource.destroy());
    resource.subscribe(() => {});
    await vi.advanceTimersByTimeAsync(1); // the socket's deferred open

    const socket = FakeSocket.last!;
    const subscribes = () => socket.sent.filter((m) => m.method === "eth_subscribe");
    // Reject whatever subscribe is outstanding, then let the backoff elapse.
    const rejectPending = async () => {
      const last = subscribes().at(-1);
      if (!last) return;
      socket.onmessage?.({
        data: JSON.stringify({
          jsonrpc: "2.0",
          id: last.id,
          error: { code: -32000, message: "since is older than the replay buffer" },
        }),
      });
      await vi.advanceTimersByTimeAsync(60_000); // past the capped 30s backoff
    };

    for (let i = 0; i < 12; i++) await rejectPending();
    // The initial subscribe plus at most MAX_SUB_RETRIES retries.
    expect(subscribes()).toHaveLength(6);
  });

  // The node's reason enum is extensible and this app ships ahead of the fleet,
  // so a spelling this build predates is expected rather than exceptional. It
  // has to survive the decode: filtering to known spellings turns a FAILED
  // withdrawal into a claimable-looking one, and the consumer then announces the
  // money is on its way and waits for an L1 event that can never fire.
  it("keeps a failure reason it has never seen instead of reading it as success", async () => {
    const { resource, push } = await started([[]]);
    await push([{ ...wire(1, 5_000), error: "token_not_bridged" }]);
    expect(resource.get()![0]!.error).toBe("token_not_bridged");
  });

  // The other direction: an empty string is the wire saying "no reason", and it
  // must not survive as a present-but-falsy value that `if (w.error)` reads as
  // success while `error !== undefined` reads as failure.
  it("treats an empty reason as no reason", async () => {
    const { resource, push } = await started([[]]);
    await push([{ ...wire(2, 6_000), error: "" }]);
    expect(resource.get()![0]!.error).toBeUndefined();
  });
});
