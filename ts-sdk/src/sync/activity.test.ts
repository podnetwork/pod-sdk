// `ActivityHistory`: the REST seed, the `pod_activity_v2` fold on top of it, and
// the resume rules. None of it is reachable from `typecheck` — a frame is
// `unknown` off the socket — and the cursor rule differs from the order feed's:
// one frame per tick, so the batch alone says whether a frame was delivered.

import { describe, expect, it, vi } from "vitest";

import { ActivityHistory } from "./activity.js";
import type { ActivityEvent, ActivityQuery, Address, Hex, MarketId } from "../types/public.js";
import type { WireActivityEntry, WireActivityFrame } from "../types/wire.js";
import { decodeActivityEntry } from "../codec/decode.js";
import { WAD } from "../codec/units.js";
import type { ActivityPage } from "../transport/rest.js";
import { PodSubscriptionClosedError, type SubParams } from "../transport/ws.js";
import type { SyncContext } from "./sources.js";

const ACCOUNT = "0xa1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1" as Address;
const TOKEN = "0x7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e" as Address;
const BOOK = "0x000000000000000000000000000000000000000000000000000000000000000a" as MarketId;
const SEED_TICK = 3_000_000;

const hex = (n: bigint) => `0x${n.toString(16)}`;
const units = (n: bigint) => n * WAD;
const id = (n: number) => `0x${n.toString(16).padStart(64, "0")}` as Hex;
const flush = () => new Promise((r) => setTimeout(r, 0));

const wireOrder = (n: number, at: number): WireActivityEntry => ({
  activity_type: "order",
  timestamp_us: at,
  orderbook_id: BOOK,
  market_type: "perpetual",
  kind: "user_signed",
  order_id: id(n),
  tx_hash: id(n + 100),
  bidder: ACCOUNT,
  nonce: n,
  order_type: "limit",
  status: "active",
  side: "buy",
  price: hex(units(100n)),
  initial_size: units(2n).toString(),
  filled_base_amount: "0x0",
  filled_quote_amount: "0x0",
  fee: "0x0",
  deadline: at,
  end: at + 600_000,
  included_batch: at,
  fills: [],
});

const wireBackstop = (at: number): WireActivityEntry => ({
  activity_type: "backstop",
  timestamp_us: at,
  user: ACCOUNT,
  orderbook_id: BOOK,
  size: (-units(2n)).toString(),
  cash: "0",
  mark_price: hex(units(100n)),
  equity: (-units(5n)).toString(),
  realized_pnl: (-units(1n)).toString(),
  timestamp: at,
});

const wireBridge = (n: number, at: number): WireActivityEntry => ({
  activity_type: "bridge_transfer",
  timestamp_us: at,
  tx_hash: id(n),
  token: TOKEN,
  amount: "-900",
  error: "insufficient_balance",
});

const wireTransfer = (n: number, at: number): WireActivityEntry => ({
  activity_type: "transfer",
  timestamp_us: at,
  transfer_id: id(n),
  token: TOKEN,
  amount: "1700",
});

/** The page the node serves, newest first: `(timestamp, ordinal, key)` descending. */
const SEED: WireActivityEntry[] = [
  wireTransfer(3, SEED_TICK),
  wireBridge(2, SEED_TICK),
  wireBackstop(SEED_TICK),
  wireOrder(1, SEED_TICK),
];

function page(entries: WireActivityEntry[], nextCursor: string | null = null): ActivityPage {
  return { activity: entries.map(decodeActivityEntry), nextCursor, solutionNow: SEED_TICK / 1000 };
}

/**
 * `ActivityHistory` over a stub context: scripted REST pages, and a websocket
 * whose `subscribe` hands us the frame and error callbacks so a test can deliver
 * what the transport would.
 */
function harness(opts?: { pages?: ActivityPage[]; query?: ActivityQuery }) {
  const pages = [...(opts?.pages ?? [page(SEED)])];
  let deliver: ((r: unknown) => void) | undefined;
  let refuse: ((e: unknown) => void) | undefined;
  const subscribed: SubParams[] = [];
  const updates: SubParams[] = [];
  let resubscribes = 0;
  const ws = {
    state: "open",
    on: () => () => {},
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
    activity: vi.fn(async (_account: Address, q?: unknown) => {
      queries.push(q);
      return pages.shift() ?? page([]);
    }),
  };
  const history = new ActivityHistory(
    { rest, ws, positionResyncMs: 0, marketResyncMs: 0 } as unknown as SyncContext,
    ACCOUNT,
    opts?.query,
  );
  return {
    history,
    queries,
    subscribed,
    updates,
    frame: (f: unknown) => deliver?.(f),
    close: (e: unknown) => refuse?.(e),
    restCalls: () => rest.activity.mock.calls.length,
    resubscribes: () => resubscribes,
  };
}

const FRAME: WireActivityFrame = {
  batch: SEED_TICK + 500_000,
  orders: [{ id: id(9), tx: id(109), book: BOOK, n: 9, px: units(101n).toString(), sz: units(1n).toString() }],
  events: [
    { k: "new", o: 0 },
    {
      k: "backstop",
      book: BOOK,
      size: (-units(2n)).toString(),
      cash: "0",
      mark: units(100n).toString(),
      equity: (-units(5n)).toString(),
      pnl: (-units(1n)).toString(),
    },
    { k: "bridge_transfer", tx: id(21), token: TOKEN, amount: units(10n).toString() },
    { k: "transfer", id: id(22), token: TOKEN, amount: (-units(5n)).toString() },
  ],
};

describe("ActivityHistory seed", () => {
  it("decodes every kind the page carries", async () => {
    const { history } = harness();
    const entries = await history.ready();

    expect(entries.map((e) => e.activityType)).toEqual(["transfer", "bridge_transfer", "backstop", "order"]);
    const [transfer, bridge, backstop] = entries;
    if (transfer?.activityType !== "transfer") throw new Error("expected a transfer");
    expect(transfer.amount).toBe(1700n);
    if (bridge?.activityType !== "bridge_transfer") throw new Error("expected a bridge transfer");
    expect(bridge.amount).toBe(-900n);
    expect(bridge.error).toBe("insufficient_balance");
    if (backstop?.activityType !== "backstop") throw new Error("expected a backstop");
    expect(backstop.realizedPnl).toBe(-units(1n));
  });

  it("subscribes from the page's watermark, in micros", async () => {
    const { history, subscribed } = harness();
    await history.ready();
    await flush();
    expect(subscribed).toEqual([{ account: ACCOUNT, since: SEED_TICK }]);
  });

  it("passes the query's types and window to REST, in micros", async () => {
    const { history, queries } = harness({
      query: { types: ["transfer", "order"], from: 1_000, to: 2_000, limit: 25 },
    });
    await history.ready();
    expect(queries[0]).toMatchObject({
      types: ["transfer", "order"],
      from: 1_000,
      to: 2_000,
      limit: 25,
    });
  });
});

describe("ActivityHistory stream", () => {
  it("applies a frame's orders and money, and emits every event", async () => {
    const { history, frame } = harness();
    const seen: ActivityEvent[][] = [];
    const off = history.onEvent((events) => seen.push(events));
    await history.ready();
    await flush();

    frame(FRAME);
    expect(seen).toHaveLength(1);
    expect(seen[0]!.map((e) => ("activityType" in e ? e.activityType : e.kind)))
      .toEqual(["new", "backstop", "bridge_transfer", "transfer"]);

    const entries = history.get()!;
    // The new order, three money rows, and the four the seed carried.
    expect(entries).toHaveLength(8);
    expect(entries.filter((e) => e.activityType === "order")).toHaveLength(2);
    off();
  });

  it("drops a frame the seed already settled and applies the next one", async () => {
    const { history, frame, updates } = harness();
    await history.ready();
    await flush();

    // One frame per tick, so a frame at `since` is already delivered.
    frame({ ...FRAME, batch: SEED_TICK });
    expect(history.get()).toHaveLength(4);
    expect(updates).toHaveLength(0);

    frame(FRAME);
    expect(history.get()).toHaveLength(8);
    expect(updates).toEqual([{ since: FRAME.batch }]);
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

  it("drops the events of a type the query excludes", async () => {
    // REST filters server-side, so the seed is already narrow; the frame is not.
    const { history, frame } = harness({
      pages: [page([wireTransfer(3, SEED_TICK)])],
      query: { types: ["transfer"] },
    });
    const seen: ActivityEvent[][] = [];
    const off = history.onEvent((events) => seen.push(events));
    await history.ready();
    await flush();

    frame(FRAME);
    expect(seen[0]!.map((e) => ("activityType" in e ? e.activityType : e.kind))).toEqual(["transfer"]);
    // The excluded kinds never reach the list either — including the order the
    // frame's `new` would otherwise have created.
    expect(history.get()!.map((e) => e.activityType)).toEqual(["transfer", "transfer"]);
    off();
  });
});

describe("ActivityHistory paging", () => {
  it("merges an older page without duplicating what it already holds", async () => {
    const older = [wireTransfer(3, SEED_TICK), wireOrder(1, SEED_TICK), wireOrder(4, SEED_TICK - 500_000)];
    const { history } = harness({ pages: [page(SEED, "3000000:4:00"), page(older)] });
    await history.ready();
    expect(history.hasMore()).toBe(true);

    await history.loadOlder();
    // Only the one row the first page did not carry.
    expect(history.get()).toHaveLength(5);
    expect(history.hasMore()).toBe(false);
  });

  it("sorts newest first, ties by the node's ordinal", async () => {
    const { history } = harness({
      pages: [page([wireOrder(1, SEED_TICK), wireBackstop(SEED_TICK), wireTransfer(3, SEED_TICK)])],
    });
    const entries = await history.ready();
    expect(entries.map((e) => e.activityType)).toEqual(["transfer", "backstop", "order"]);
  });
});

describe("ActivityHistory.onEvent", () => {
  it("starts the stream on its own, and stops delivering once released", async () => {
    const { history, frame } = harness();
    const seen: string[] = [];
    const off = history.onEvent((events) => seen.push(...events.map((e) => ("activityType" in e ? e.activityType : e.kind))));
    await flush();

    frame(FRAME);
    expect(seen).toEqual(["new", "backstop", "bridge_transfer", "transfer"]);

    off();
    frame({ ...FRAME, batch: FRAME.batch + 500_000 });
    expect(seen).toEqual(["new", "backstop", "bridge_transfer", "transfer"]);
  });

  it("says nothing for the REST seed", async () => {
    const { history } = harness();
    const seen: ActivityEvent[][] = [];
    const off = history.onEvent((events) => seen.push(events));
    await flush();
    expect(seen).toEqual([]);
    off();
  });
});
