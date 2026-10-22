// A frame is `unknown` off the socket, so none of this is reachable from `typecheck`.

import { describe, expect, it, vi } from "vitest";

import { ActivityHistory, type ActivityView } from "./activity.js";
import type { ActivityEvent, ActivityQuery, Address, Hex, MarketId } from "../types/public.js";
import type { WireActivityEntry, WireOrder } from "../types/wire.js";
import { WAD } from "../codec/units.js";
import type { ActivityPage } from "../transport/rest.js";
import { PodSubscriptionClosedError, type SubParams } from "../transport/ws.js";
import type { SyncContext } from "./sources.js";

const ACCOUNT = "0xa1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1" as Address;
const TOKEN = "0x7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e" as Address;
const BOOK = "0x000000000000000000000000000000000000000000000000000000000000000a" as MarketId;
const SEED_TICK = 3_000_000;
const LIVE_TICK = SEED_TICK + 500_000;

const units = (n: bigint) => (n * WAD).toString();
const id = (n: number) => `0x${n.toString(16).padStart(64, "0")}` as Hex;
const flush = () => new Promise((r) => setTimeout(r, 0));

const order = (n: number, over: Partial<WireOrder> = {}): WireActivityEntry => ({
  k: "order", order_id: id(n), orderbook_id: BOOK, market_type: "spot", kind: "user_signed", tx_hash: id(n + 100),
  bidder: ACCOUNT, nonce: n, order_type: "limit", status: "active", side: "buy", price: `0x${(100n * WAD).toString(16)}`,
  initial_size: units(2n), filled_base_amount: "0x0", filled_quote_amount: "0x0", fee: "0x0",
  deadline: String(SEED_TICK), end: SEED_TICK + 60_000_000, included_batch: SEED_TICK, effective_price: "0x0",
  ...over,
});
const fill = (n: number): WireActivityEntry => ({
  k: "fill", id: id(n), book: BOOK, b: units(1n), q: units(100n), tb: units(1n), tq: units(100n), tf: "0",
});
const transfer = (n: number): WireActivityEntry => ({ k: "transfer", id: id(n), cp: ACCOUNT, tok: TOKEN, amt: "1700" });

function page(
  batches: Record<number, WireActivityEntry[]>,
  nextUs: number | null = null,
  solutionNowUs = SEED_TICK,
): ActivityPage {
  return {
    batches: Object.entries(batches)
      .map(([b, e]): [number, WireActivityEntry[]] => [Number(b), e])
      .sort((a, b) => b[0] - a[0]),
    nextUs,
    solutionNow: solutionNowUs / 1000,
  };
}

const SEED = page({ [SEED_TICK]: [order(1), transfer(3)] });

function harness(opts?: { pages?: (ActivityPage | Error)[]; query?: ActivityQuery; defer?: boolean }) {
  const pages = [...(opts?.pages ?? [SEED])];
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
  const queries: unknown[] = [];
  const rest = {
    activity: vi.fn((_account: Address, q?: unknown) => {
      queries.push(q);
      if (opts?.defer) return new Promise<ActivityPage>((resolve) => { pending.push(resolve); });
      const next = pages.shift() ?? page({});
      return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
    }),
  };
  const feed = new ActivityHistory(
    { rest, ws, positionResyncMs: 0, marketResyncMs: 0 } as unknown as SyncContext,
    ACCOUNT,
  );
  return {
    feed,
    history: opts?.query ? feed.view(opts.query) : feed,
    queries,
    subscribed,
    updates,
    frame: (f: unknown) => deliver?.(f),
    close: (e: unknown) => refuse?.(e),
    open: () => onOpen?.(),
    pending,
    settle: (i: number, p: ActivityPage) => pending[i]!(p),
    restCalls: () => rest.activity.mock.calls.length,
    resubscribes: () => resubscribes,
  };
}

const kinds = (h: ActivityView) => h.get()!.map((e) => e.activityType);
const kindOf = (e: ActivityEvent) => ("activityType" in e ? e.activityType : e.kind);

describe("ActivityHistory seed", () => {
  it("paints the newest page and subscribes from its watermark", async () => {
    const { history, subscribed } = harness({
      pages: [page({ [SEED_TICK]: [order(1), transfer(3)], [SEED_TICK - 500_000]: [transfer(2)] }, 2_000_000)],
    });
    const rows = await history.ready();
    await flush();
    expect(rows.map((e) => e.activityType)).toEqual(["order", "transfer", "transfer"]);
    expect(history.hasMore()).toBe(true);
    expect(subscribed).toEqual([{ account: ACCOUNT, since: SEED_TICK }]);
  });

  it("seeds with no types or window, whatever a view asks for", async () => {
    const { history, queries } = harness({ query: { types: ["transfer", "order"], from: 1_000, to: 2_000 } });
    await history.ready();
    expect(queries[0]).toBeUndefined();
  });

  it("reads an empty `types` as no filter", async () => {
    const { feed, history, frame } = harness({ query: { types: [] } });
    expect(history).toBe(feed.view({}));
    await history.ready();
    await flush();
    frame({ [LIVE_TICK]: [transfer(4), { k: "cancel_reject", id: id(1), book: BOOK, why: "order not found" }] });
    expect(kinds(history)).toEqual(["transfer", "cancel_reject", "order", "transfer"]);
  });
});

describe("ActivityHistory paging", () => {
  it("passes `nextUs` back as `to`, shows the state each order carries, and reports the end", async () => {
    const { history, queries } = harness({
      pages: [
        page({ [SEED_TICK]: [fill(1)] }, 2_999_999),
        page({ [2_000_000]: [order(1, { filled_base_amount: `0x${WAD.toString(16)}` })] }),
      ],
    });
    await history.ready();
    await history.loadOlder();
    expect(queries[1]).toMatchObject({ toUs: 2_999_999 });
    expect(kinds(history)).toEqual(["fill", "order"]);
    expect(history.hasMore()).toBe(false);
    const placed = history.get()![1];
    if (placed?.activityType !== "order") throw new Error("expected an order");
    expect(placed.order.filledBase).toBe(WAD);

    await history.loadOlder();
    expect(queries).toHaveLength(2);
  });

  it("keeps one copy of a batch served twice", async () => {
    const { history } = harness({
      pages: [page({ [SEED_TICK]: [transfer(3)] }, 2_000_000), page({ [SEED_TICK]: [transfer(3)] })],
    });
    await history.ready();
    await history.loadOlder();
    expect(kinds(history)).toEqual(["transfer"]);
  });
});

describe("ActivityHistory stream", () => {
  it("folds a live frame on the seed's state and emits its events", async () => {
    const { history, frame, updates } = harness();
    const seen: ActivityEvent[][] = [];
    const off = history.onEvent((events) => seen.push(events));
    await history.ready();
    await flush();

    frame({ [LIVE_TICK]: [order(9), fill(1), transfer(4)] });
    expect(seen.map((events) => events.map(kindOf))).toEqual([["new", "fill", "transfer"]]);
    const filled = seen[0]![1]!;
    if ("activityType" in filled) throw new Error("expected an order event");
    expect(filled.fill).toEqual({
      base: WAD, quote: 100n * WAD, price: 100n * WAD, time: LIVE_TICK / 1000, totalBase: WAD, closedAs: undefined,
    });
    expect(kinds(history)).toEqual(["order", "fill", "transfer", "order", "transfer"]);
    const seeded = history.get()![3];
    if (seeded?.activityType !== "order") throw new Error("expected an order");
    expect(seeded.order.filledBase).toBe(WAD);
    expect(updates).toEqual([{ since: LIVE_TICK }]);
    off();
  });

  it("keeps a live fill on a seeded order across `loadOlder`", async () => {
    const { history, frame } = harness({
      pages: [page({ [SEED_TICK]: [order(1)] }, 2_000_000), page({ [2_000_000]: [transfer(2)] })],
    });
    await history.ready();
    await flush();
    frame({ [LIVE_TICK]: [fill(1)] });
    await history.loadOlder();
    expect(kinds(history)).toEqual(["fill", "order", "transfer"]);
    const seeded = history.get()![1];
    if (seeded?.activityType !== "order") throw new Error("expected an order");
    expect(seeded.order.filledBase).toBe(WAD);
    expect(seeded.order).not.toHaveProperty("fills");
  });

  it("drops a frame at or below `since`, and one already held", async () => {
    const { history, frame } = harness({
      // A batch above the watermark, as an indexer slightly ahead of its own status can serve.
      pages: [page({ [LIVE_TICK]: [transfer(3)] })],
    });
    await history.ready();
    await flush();

    frame({ [SEED_TICK]: [transfer(5)] });
    frame({ [LIVE_TICK]: [transfer(6)] });
    expect(history.get()).toHaveLength(1);

    frame({ [LIVE_TICK + 500_000]: [transfer(7)] });
    frame({ [LIVE_TICK + 500_000]: [transfer(7)] });
    expect(history.get()).toHaveLength(2);
  });

  it("ignores a message that is not a single-batch map", async () => {
    const { history, frame } = harness();
    await history.ready();
    await flush();
    frame({ [LIVE_TICK]: [transfer(4)], [LIVE_TICK + 1]: [transfer(5)] });
    frame(null);
    frame({ [LIVE_TICK]: "nope" });
    expect(history.get()).toHaveLength(2);
  });

  it("shows a `types` view only its kinds and events", async () => {
    const { history, frame } = harness({ query: { types: ["order"] }, pages: [page({ [SEED_TICK]: [order(1)] })] });
    const seen: ActivityEvent[][] = [];
    const off = history.onEvent((events) => seen.push(events));
    await history.ready();
    await flush();

    frame({ [LIVE_TICK]: [fill(1), transfer(4), { k: "cancel_reject", id: id(1), book: BOOK, why: "order not found" }] });
    expect(seen).toEqual([]);
    expect(kinds(history)).toEqual(["order"]);
    const held = history.get()![0];
    if (held?.activityType !== "order") throw new Error("expected an order");
    expect(held.order.filledBase, "the feed folds the fill a view hides").toBe(WAD);
    off();
  });

  it("shows a `cancel_reject` view only refused cancels, row and event", async () => {
    const { history, frame } = harness({ query: { types: ["cancel_reject"] }, pages: [page({ [SEED_TICK]: [order(1)] })] });
    const seen: ActivityEvent[][] = [];
    const off = history.onEvent((events) => seen.push(events));
    await history.ready();
    await flush();

    frame({ [LIVE_TICK]: [fill(1), { k: "cancel_reject", id: id(1), book: BOOK, why: "order not found" }] });
    expect(seen.map((events) => events.map(kindOf))).toEqual([["cancel_reject"]]);
    expect(kinds(history)).toEqual(["cancel_reject"]);
    off();
  });

  it("hides a frame outside a view's window, which the feed still holds", async () => {
    const { feed, history, frame } = harness({ query: { from: 0, to: 3_000 } });
    await history.ready();
    await flush();
    frame({ [LIVE_TICK]: [transfer(4)] });
    expect(history.get()).toHaveLength(2);
    expect(feed.get()).toHaveLength(3);
  });

  it("resumes a closed stream, then re-seeds once resuming stops working", async () => {
    vi.useFakeTimers();
    try {
      const { history, close, resubscribes, restCalls } = harness();
      history.subscribe(() => {});
      await vi.advanceTimersByTimeAsync(0);
      const seeds = restCalls();

      const closed = (resumable: boolean) => new PodSubscriptionClosedError({
        code: resumable ? -32020 : -32023,
        data: { resumable, resume_since: SEED_TICK + 1_000_000 },
      });

      close(closed(true));
      expect(resubscribes()).toBe(1);
      expect(restCalls(), "a resumable close needs no re-seed").toBe(seeds);

      close(closed(false));
      await vi.advanceTimersByTimeAsync(1_000);
      expect(restCalls(), "and a non-resumable one re-seeds over REST").toBe(seeds + 1);
      expect(resubscribes()).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("retries a failed initial seed until one lands, then subscribes once", async () => {
    vi.useFakeTimers();
    try {
      const { history, subscribed, restCalls } = harness({ pages: [new Error("indexer unavailable"), SEED] });
      history.subscribe(() => {});
      await vi.advanceTimersByTimeAsync(0);
      expect(restCalls()).toBe(1);
      expect(subscribed).toHaveLength(0);

      await vi.advanceTimersByTimeAsync(500);
      expect(restCalls()).toBe(2);
      expect(subscribed).toEqual([{ account: ACCOUNT, since: SEED_TICK }]);
      expect(history.get()).toHaveLength(2);

      await vi.advanceTimersByTimeAsync(60_000);
      expect(subscribed).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("ActivityHistory.onEvent", () => {
  it("starts the stream on its own, and stops delivering once released", async () => {
    const { history, frame } = harness();
    const seen: string[] = [];
    const off = history.onEvent((events) => seen.push(...events.map(kindOf)));
    await flush();

    frame({ [LIVE_TICK]: [transfer(4)] });
    expect(seen).toEqual(["transfer"]);

    off();
    frame({ [LIVE_TICK + 500_000]: [transfer(5)] });
    expect(seen).toEqual(["transfer"]);
  });

  it("says nothing for REST pages", async () => {
    const { history } = harness();
    const seen: ActivityEvent[][] = [];
    const off = history.onEvent((events) => seen.push(events));
    await flush();
    expect(seen).toEqual([]);
    off();
  });
});

describe("ActivityHistory re-seed", () => {
  it("fills the gap above the cursor and keeps the paging position", async () => {
    const { history, frame, open, queries } = harness({
      pages: [
        page({ [SEED_TICK]: [order(1)] }, 2_000_000),
        page({ [LIVE_TICK + 1_000_000]: [fill(1)] }, LIVE_TICK + 600_000, LIVE_TICK + 1_000_000),
        page({ [LIVE_TICK + 500_000]: [transfer(5)] }, null, LIVE_TICK + 1_000_000),
        page({ [1_000_000]: [transfer(1)] }),
      ],
    });
    history.subscribe(() => {});
    await flush();
    frame({ [LIVE_TICK]: [transfer(4)] });

    open();
    await flush();
    expect(queries.slice(1, 3)).toEqual([
      { fromUs: LIVE_TICK + 1, toUs: undefined },
      { fromUs: LIVE_TICK + 1, toUs: LIVE_TICK + 600_000 },
    ]);
    expect(kinds(history)).toEqual(["fill", "transfer", "transfer", "order"]);
    expect(history.hasMore()).toBe(true);

    await history.loadOlder();
    expect(queries[3]).toMatchObject({ toUs: 2_000_000 });
    expect(history.hasMore()).toBe(false);
  });

  it("applies a gap page's transitions to an order held from an earlier fetch, silently", async () => {
    const { history, open } = harness({
      pages: [
        page({ [SEED_TICK]: [order(1)] }),
        page({ [LIVE_TICK]: [{ ...fill(1), tb: units(2n), tq: units(200n), tf: "5", st: "filled" } as WireActivityEntry] },
          null, LIVE_TICK),
      ],
    });
    const seen: ActivityEvent[][] = [];
    const off = history.onEvent((events) => seen.push(events));
    await flush();

    open();
    await flush();
    expect(kinds(history)).toEqual(["fill", "order"]);
    const held = history.get()![1];
    if (held?.activityType !== "order") throw new Error("expected an order");
    expect(held.order).toMatchObject({ status: "filled", filledBase: 2n * WAD, filledQuote: 200n * WAD, fee: 5n });
    expect(seen).toEqual([]);
    off();
  });

  it("ignores a seed that lands after a fresher one", async () => {
    const { history, open, pending, settle, subscribed } = harness({ defer: true });
    history.subscribe(() => {});
    await flush();
    open();
    await flush();
    expect(pending).toHaveLength(2);

    settle(1, page({ [SEED_TICK]: [transfer(3)] }));
    await flush();
    settle(0, page({ [SEED_TICK]: [transfer(9)] }, null, SEED_TICK + 5_000_000));
    await flush();

    const ids = history.get()!.map((e) => (e.activityType === "transfer" ? e.transferId : e.activityType));
    expect(ids).toEqual([id(3)]);
    expect(subscribed).toEqual([{ account: ACCOUNT, since: SEED_TICK }]);
  });

  it("does not report an error once an empty first page has painted", async () => {
    vi.useFakeTimers();
    try {
      const { history, close } = harness({ pages: [page({}), new Error("indexer down")] });
      history.subscribe(() => {});
      await vi.advanceTimersByTimeAsync(0);
      expect(history.get()).toEqual([]);

      close(new PodSubscriptionClosedError({ code: -32023, data: { resumable: false } }));
      await vi.advanceTimersByTimeAsync(1_000);
      expect(history.error).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("ActivityHistory views", () => {
  const OLDER_TICK = SEED_TICK - 500_000;
  const twoBatches = () => page({ [SEED_TICK]: [order(1), transfer(3)], [OLDER_TICK]: [transfer(2)] }, 2_000_000);

  it("share the feed's one subscription and one REST seed", async () => {
    const { feed, subscribed, restCalls } = harness({ pages: [twoBatches()] });
    const orders = feed.view({ types: ["order"] });
    const recent = feed.view({ from: 2_600 });
    const offs = [orders.subscribe(() => {}), recent.subscribe(() => {}), orders.onEvent(() => {})];
    await flush();
    await flush();
    expect(subscribed).toHaveLength(1);
    expect(restCalls()).toBe(1);
    expect(kinds(orders)).toEqual(["order"]);
    expect(kinds(recent)).toEqual(["order", "transfer"]);
    expect(feed.view({ types: ["order"] })).toBe(orders);
    offs.forEach((off) => off());
  });

  it("filters by an inclusive window and stops paging at its floor", async () => {
    const { feed, restCalls } = harness({ pages: [twoBatches()] });
    const windowed = feed.view({ from: OLDER_TICK / 1000, to: SEED_TICK / 1000 - 1 });
    const open = feed.view({ from: 1_000 });
    await windowed.ready();
    expect(kinds(windowed)).toEqual(["transfer"]);
    expect(windowed.hasMore()).toBe(false);
    expect(open.hasMore()).toBe(true);

    await windowed.loadOlder();
    expect(restCalls()).toBe(1);
  });

  it("page the feed through `loadOlder`, and every view sees the new rows", async () => {
    const { feed, queries } = harness({ pages: [twoBatches(), page({ [1_500_000]: [order(5), transfer(6)] })] });
    const orders = feed.view({ types: ["order"] });
    const transfers = feed.view({ types: ["transfer"] });
    await orders.ready();
    await orders.loadOlder();
    expect(queries[1]).toEqual({ toUs: 2_000_000 });
    expect(kinds(orders)).toEqual(["order", "order"]);
    expect(kinds(transfers)).toEqual(["transfer", "transfer", "transfer"]);
    expect(feed.hasMore()).toBe(false);
    expect(transfers.hasMore()).toBe(false);
  });
});
