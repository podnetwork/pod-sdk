// `ActivityHistory`: history loaded by window over REST, the `pod_activity` fold
// on top of it, and the resume rules. None of it is reachable from `typecheck` —
// a frame is `unknown` off the socket — and the cursor rule differs from the
// order feed's: one frame per tick, so the batch alone says whether a frame was
// delivered.

import { describe, expect, it, vi } from "vitest";

import { ActivityHistory } from "./activity.js";
import type { ActivityEvent, ActivityQuery, Address, Hex, MarketId } from "../types/public.js";
import type { WireActivityFrame, WireOrderEntity } from "../types/wire.js";
import { WAD } from "../codec/units.js";
import type { ActivityPage, ActivityQueryRest } from "../transport/rest.js";
import { PodSubscriptionClosedError, type SubParams } from "../transport/ws.js";
import type { SyncContext } from "./sources.js";

const ACCOUNT = "0xa1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1" as Address;
const TOKEN = "0x7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e" as Address;
const BOOK = "0x000000000000000000000000000000000000000000000000000000000000000a" as MarketId;
const HOUR = 3_600_000_000;
const MINUTE = 60_000_000;
/** The indexer's watermark: ten hours in, so every window below it is in range. */
const NOW = 10 * HOUR;

const units = (n: bigint) => n * WAD;
const id = (n: number) => `0x${n.toString(16).padStart(64, "0")}` as Hex;
const flush = () => new Promise((r) => setTimeout(r, 0));
const kinds = (events: ActivityEvent[]) => events.map((e) => ("activityType" in e ? e.activityType : e.kind));

const entity = (n: number): WireOrderEntity =>
  ({ id: id(n), tx: id(n + 100), book: BOOK, n, px: units(100n).toString(), sz: units(2n).toString() });
const placed = (batch: number, n: number): WireActivityFrame =>
  ({ batch, orders: [entity(n)], events: [{ k: "new", o: 0 }] });
/** A fill of order `n` with `tb` filled so far; `hydrated` attaches the entity, as a REST page does. */
const filled = (batch: number, n: number, tb: bigint, hydrated = false): WireActivityFrame => ({
  batch,
  orders: hydrated ? [entity(n)] : [],
  events: [{ k: "fill", id: id(n), b: units(1n).toString(), q: units(100n).toString(), tb: tb.toString(), tq: units(100n).toString(), tf: "0" }],
});
const transferred = (batch: number, n: number): WireActivityFrame =>
  ({ batch, orders: [], events: [{ k: "transfer", id: id(n), token: TOKEN, amount: "1700" }] });

/**
 * `ActivityHistory` over a stub context: a node whose history is `history`
 * (frames, any order), answering window queries the way the route does — oldest
 * first, whole batches, `limit` of them — and a websocket whose `subscribe`
 * hands us the frame and error callbacks so a test can deliver what the
 * transport would.
 */
function harness(opts?: {
  history?: WireActivityFrame[];
  query?: ActivityQuery;
  failSeeds?: number;
  defer?: boolean;
}) {
  const history = [...(opts?.history ?? [])].sort((a, b) => a.batch - b.batch);
  let now = NOW;
  let failSeeds = opts?.failSeeds ?? 0;
  const pending: ((p: ActivityPage) => void)[] = [];
  let onOpen: (() => void) | undefined;
  let deliver: ((r: unknown) => void) | undefined;
  let refuse: ((e: unknown) => void) | undefined;
  const subscribed: SubParams[] = [];
  const updates: SubParams[] = [];
  let resubscribes = 0;
  const ws = {
    state: "open",
    on: (_event: string, handler: () => void) => { onOpen = handler; return () => { onOpen = undefined; }; },
    subscribe: (
      _channel: string,
      params: SubParams,
      onMessage: (r: unknown) => void,
      onError: (e: unknown) => void,
    ) => {
      subscribed.push(params);
      deliver = onMessage;
      refuse = onError;
      return {
        unsubscribe: () => {},
        update: (p: SubParams) => updates.push(p),
        resubscribe: () => { resubscribes++; },
      };
    },
  };
  const queries: ActivityQueryRest[] = [];
  const answer = (q: ActivityQueryRest): ActivityPage => {
    const inWindow = history.filter((f) => f.batch >= (q.fromUs ?? 0) && f.batch <= (q.toUs ?? Infinity));
    const limit = q.limit ?? 100;
    return {
      frames: inWindow.slice(0, limit),
      nextCursorUs: inWindow[limit]?.batch ?? null,
      solutionNow: now / 1000,
    };
  };
  const rest = {
    status: vi.fn(async () => ({ solutionNow: now / 1000 })),
    activity: vi.fn((_account: Address, q: ActivityQueryRest) => {
      queries.push(q);
      if (failSeeds > 0) { failSeeds--; return Promise.reject(new Error("indexer unavailable")); }
      if (opts?.defer) return new Promise<ActivityPage>((resolve) => { pending.push(resolve); });
      return Promise.resolve(answer(q));
    }),
  };
  const activity = new ActivityHistory(
    { rest, ws, positionResyncMs: 0, marketResyncMs: 0 } as unknown as SyncContext,
    ACCOUNT,
    opts?.query,
  );
  return {
    activity,
    queries,
    subscribed,
    updates,
    frame: (f: unknown) => deliver?.(f),
    close: (e: unknown) => refuse?.(e),
    open: () => onOpen?.(),
    advanceNode: (frames: WireActivityFrame[], to: number) => {
      history.push(...frames);
      history.sort((a, b) => a.batch - b.batch);
      now = to;
    },
    pending,
    settle: (i: number) => pending[i]!(answer(queries[i]!)),
    restCalls: () => rest.activity.mock.calls.length,
    statusCalls: () => rest.status.mock.calls.length,
    resubscribes: () => resubscribes,
  };
}

describe("ActivityHistory seed", () => {
  it("paints the newest window, newest first, and subscribes from the watermark", async () => {
    const { activity, queries, subscribed } = harness({
      history: [placed(NOW - 2 * HOUR, 1), transferred(NOW - 30 * MINUTE, 3), filled(NOW - 10 * MINUTE, 1, units(1n), true)],
    });
    const events = await activity.ready();
    await flush();

    // Exactly one window wide, so the windows `loadOlder` adds tile without a gap.
    expect(queries).toEqual([{ fromUs: NOW + 1 - HOUR, toUs: NOW, limit: undefined }]);
    expect(kinds(events)).toEqual(["fill", "transfer"]);
    expect(subscribed).toEqual([{ account: ACCOUNT, since: NOW }]);
    expect(activity.hasMore()).toBe(true);
  });

  it("widens the window until history turns up, doubling each time", async () => {
    const { activity, queries } = harness({ history: [transferred(NOW - 5 * HOUR, 3)] });
    const events = await activity.ready();

    expect(queries.map((q) => [q.fromUs, q.toUs])).toEqual([
      [NOW + 1 - HOUR, NOW],
      [NOW + 1 - 3 * HOUR, NOW - HOUR],
      [NOW + 1 - 7 * HOUR, NOW - 3 * HOUR],
    ]);
    expect(kinds(events)).toEqual(["transfer"]);
    expect(activity.hasMore()).toBe(true);
  });

  it("stops at the query's `from`, and bounds the first window by its `to`", async () => {
    const { activity, queries } = harness({
      history: [transferred(NOW - 20 * MINUTE, 3)],
      query: { from: (NOW - 30 * MINUTE) / 1000, to: (NOW - 15 * MINUTE) / 1000 },
    });
    await activity.ready();
    expect(queries).toEqual([{ fromUs: NOW - 30 * MINUTE, toUs: NOW - 15 * MINUTE, limit: undefined }]);
    expect(activity.hasMore()).toBe(false);
  });

  it("pages a window the node splits, passing the cursor back as `from`", async () => {
    const batches = [NOW - 50 * MINUTE, NOW - 40 * MINUTE, NOW - 30 * MINUTE];
    const { activity, queries } = harness({
      history: batches.map((b, i) => transferred(b, i)),
      query: { limit: 2 },
    });
    const events = await activity.ready();
    expect(queries.map((q) => q.fromUs)).toEqual([NOW + 1 - HOUR, NOW - 30 * MINUTE]);
    expect(events).toHaveLength(3);
  });

  it("reads an empty `types` as no filter", async () => {
    const { activity, frame } = harness({ history: [transferred(NOW - MINUTE, 3)], query: { types: [] } });
    await activity.ready();
    await flush();
    frame(placed(NOW + 500_000, 9));
    expect(activity.get()).toHaveLength(2);
  });
});

describe("ActivityHistory stream", () => {
  it("folds a live frame on the state the seed built, and emits its events", async () => {
    const { activity, frame, updates } = harness({ history: [placed(NOW - 30 * MINUTE, 1)] });
    const seen: ActivityEvent[][] = [];
    const off = activity.onEvent((events) => seen.push(events));
    await activity.ready();
    await flush();

    frame(filled(NOW + 500_000, 1, units(1n)));
    expect(seen.map(kinds)).toEqual([["fill"]]);
    expect(activity.order(id(1))?.filledBase).toBe(units(1n));
    expect(activity.order(id(1))?.includedMs).toBe((NOW - 30 * MINUTE) / 1000);
    expect(kinds(activity.get()!)).toEqual(["fill", "new"]);
    expect(updates).toEqual([{ since: NOW + 500_000 }]);
    off();
  });

  it("drops a frame it already holds, from either source", async () => {
    const { activity, frame, updates } = harness({ history: [transferred(NOW - MINUTE, 3)] });
    await activity.ready();
    await flush();

    // One frame per tick, so a frame at `since` is already delivered.
    frame(transferred(NOW, 4));
    expect(activity.get()).toHaveLength(1);
    expect(updates).toHaveLength(0);

    frame(transferred(NOW + 500_000, 5));
    frame(transferred(NOW + 500_000, 5));
    expect(activity.get()).toHaveLength(2);
    expect(updates).toEqual([{ since: NOW + 500_000 }]);
  });

  it("keeps only the kinds the query asks for, from either source", async () => {
    const { activity, frame } = harness({
      history: [placed(NOW - 30 * MINUTE, 1), transferred(NOW - MINUTE, 3)],
      query: { types: ["transfer"] },
    });
    const seen: ActivityEvent[][] = [];
    const off = activity.onEvent((events) => seen.push(events));
    await activity.ready();
    await flush();

    frame({ ...placed(NOW + 500_000, 9), events: [{ k: "new", o: 0 }, { k: "transfer", id: id(4), token: TOKEN, amount: "1" }] });
    expect(seen.map(kinds)).toEqual([["transfer"]]);
    // The excluded kinds never reach the list either — including the order the
    // frame's `new` would otherwise have created.
    expect(kinds(activity.get()!)).toEqual(["transfer", "transfer"]);
    expect(activity.order(id(9))).toBeUndefined();
    off();
  });

  it("drops a live frame past the query's `to`", async () => {
    const { activity, frame } = harness({ history: [transferred(NOW - MINUTE, 3)], query: { to: NOW / 1000 } });
    await activity.ready();
    await flush();
    frame(transferred(NOW + 500_000, 4));
    expect(activity.get()).toHaveLength(1);
  });

  it("resumes a closed stream, then re-seeds once resuming stops working", async () => {
    vi.useFakeTimers();
    try {
      const { activity, close, resubscribes, statusCalls } = harness();
      activity.subscribe(() => {});
      await vi.advanceTimersByTimeAsync(0);
      const seeds = statusCalls();

      const closed = (resumable: boolean) => new PodSubscriptionClosedError({
        code: resumable ? -32020 : -32023,
        data: { resumable, resume_since: NOW + 1_000_000 },
      });

      close(closed(true));
      expect(resubscribes()).toBe(1);
      expect(statusCalls(), "a resumable close needs no re-seed").toBe(seeds);

      close(closed(false));
      await vi.advanceTimersByTimeAsync(1_000);
      expect(statusCalls(), "and a non-resumable one re-seeds from the watermark").toBe(seeds + 1);
      expect(resubscribes()).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("retries a failed initial seed until one lands, then subscribes once", async () => {
    vi.useFakeTimers();
    try {
      const { activity, subscribed, restCalls } = harness({ history: [transferred(NOW - MINUTE, 3)], failSeeds: 1 });
      activity.subscribe(() => {});
      await vi.advanceTimersByTimeAsync(0);
      // Nothing is subscribed yet, so no close or rejection would ever arrive to
      // schedule another attempt — the seed has to re-arm itself.
      expect(restCalls()).toBe(1);
      expect(subscribed).toHaveLength(0);

      await vi.advanceTimersByTimeAsync(500);
      expect(restCalls()).toBe(2);
      expect(subscribed).toEqual([{ account: ACCOUNT, since: NOW }]);
      expect(activity.get()).toHaveLength(1);

      await vi.advanceTimersByTimeAsync(60_000);
      expect(subscribed).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("ActivityHistory paging", () => {
  it("replays an older window in batch order, so an earlier fill does not undo a later one", async () => {
    const { activity } = harness({
      history: [placed(NOW - 2 * HOUR, 1), filled(NOW - 90 * MINUTE, 1, units(1n)), filled(NOW - 10 * MINUTE, 1, units(2n), true)],
    });
    await activity.ready();
    // Only the newest window so far: the order is hydrated, placed who knows when.
    expect(kinds(activity.get()!)).toEqual(["fill"]);
    expect(activity.order(id(1))?.includedMs).toBeUndefined();
    expect(activity.order(id(1))?.filledBase).toBe(units(2n));

    await activity.loadOlder();
    expect(kinds(activity.get()!)).toEqual(["fill", "fill", "new"]);
    expect(activity.order(id(1))?.includedMs).toBe((NOW - 2 * HOUR) / 1000);
    expect(activity.order(id(1))?.filledBase).toBe(units(2n));
    expect(activity.order(id(1))?.fills).toHaveLength(2);
    expect(activity.hasMore()).toBe(true);
  });

  it("loads nothing twice, and reports the end once the floor is reached", async () => {
    const { activity, queries } = harness({
      history: [transferred(NOW - 30 * MINUTE, 3), transferred(NOW - 2 * HOUR, 4)],
      query: { from: (NOW - 150 * MINUTE) / 1000 },
    });
    await activity.ready();
    expect(activity.get()).toHaveLength(1);
    await activity.loadOlder();
    expect(queries.map((q) => [q.fromUs, q.toUs])).toEqual([[NOW + 1 - HOUR, NOW], [NOW - 150 * MINUTE, NOW - HOUR]]);
    expect(activity.get()).toHaveLength(2);
    expect(activity.hasMore()).toBe(false);
    await activity.loadOlder();
    expect(queries).toHaveLength(2);
  });
});

describe("ActivityHistory.onEvent", () => {
  it("starts the stream on its own, and stops delivering once released", async () => {
    const { activity, frame } = harness();
    const seen: string[] = [];
    const off = activity.onEvent((events) => seen.push(...kinds(events)));
    await flush();

    frame(transferred(NOW + 500_000, 3));
    expect(seen).toEqual(["transfer"]);

    off();
    frame(transferred(NOW + 1_000_000, 4));
    expect(seen).toEqual(["transfer"]);
  });

  it("says nothing for the history loaded over REST", async () => {
    const { activity } = harness({ history: [transferred(NOW - MINUTE, 3)] });
    const seen: ActivityEvent[][] = [];
    const off = activity.onEvent((events) => seen.push(events));
    await flush();
    expect(activity.get()).toHaveLength(1);
    expect(seen).toEqual([]);
    off();
  });
});

describe("ActivityHistory re-seed", () => {
  it("fills the gap the stream missed on a reconnect, and resumes past it", async () => {
    const { activity, frame, open, queries, updates, advanceNode } = harness({ history: [transferred(NOW - MINUTE, 3)] });
    activity.subscribe(() => {});
    await flush();
    frame(transferred(NOW + 500_000, 4));

    advanceNode([transferred(NOW + 1_000_000, 5)], NOW + 2_000_000);
    open();
    await flush();
    expect(queries.at(-1)).toEqual({ fromUs: NOW + 500_001, toUs: NOW + 2_000_000, limit: undefined });
    expect(kinds(activity.get()!)).toEqual(["transfer", "transfer", "transfer"]);
    expect(updates.at(-1)).toEqual({ since: NOW + 2_000_000, sinceBook: undefined });
  });

  it("keeps the paging position across a reconnect re-seed", async () => {
    const { activity, open, queries } = harness({
      history: [transferred(NOW - 30 * MINUTE, 3), transferred(NOW - 2 * HOUR, 4)],
      query: { from: (NOW - 150 * MINUTE) / 1000 },
    });
    await activity.ready();
    await activity.loadOlder();
    expect(activity.hasMore()).toBe(false);
    const paged = queries.length;

    open();
    await flush();
    expect(activity.hasMore(), "a re-seed fills the gap, not the paging state").toBe(false);
    expect(queries.length, "and no gap means no page").toBe(paged);
    expect(activity.get()).toHaveLength(2);
  });

  it("lets a fresher seed decide, and keeps nothing twice", async () => {
    const { activity, open, pending, settle, subscribed } = harness({ history: [transferred(NOW - MINUTE, 3)], defer: true });
    activity.subscribe(() => {});
    await flush();
    open();
    await flush();
    expect(pending).toHaveLength(2);

    settle(1);
    await flush();
    settle(0);
    await flush();

    expect(activity.get()).toHaveLength(1);
    expect(subscribed).toEqual([{ account: ACCOUNT, since: NOW }]);
  });

  it("does not report an error once an empty first window has painted", async () => {
    vi.useFakeTimers();
    try {
      const { activity, close } = harness({ query: { from: (NOW - HOUR) / 1000 } });
      activity.subscribe(() => {});
      await vi.advanceTimersByTimeAsync(0);
      expect(activity.get()).toEqual([]);

      close(new PodSubscriptionClosedError({ code: -32023, data: { resumable: false } }));
      await vi.advanceTimersByTimeAsync(1_000);
      // An account with no activity is a painted resource, not a failed one.
      expect(activity.error).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });
});
