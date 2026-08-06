// The stream position. A batch is delivered as one frame per book, so the position
// is a pair — and the whole of the `pod_orders_v2` resume contract rests on an
// absent book meaning "the whole batch", which sorts ABOVE every book in it.
//
// This is the mirror of `already_delivered` in `node/src/rpc/orders_v2.rs`:
// `(frame_batch, frame_book) <= (since, since_book.unwrap_or(0xff…))`. If the two
// sides disagree, the server re-sends frames the client has applied, and applying a
// frame twice appends its fills twice.

import { describe, expect, it } from "vitest";

import type { Address, MarketId, OrderEvent } from "../types/public.js";
import { OrderHistory, compareCursor } from "./orders.js";
import type { SyncContext } from "./sources.js";

const book = (n: number) => `0x${n.toString(16).padStart(64, "0")}` as MarketId;
const B1 = book(1);
const B9 = book(9);

describe("compareCursor", () => {
  it("orders by batch first", () => {
    expect(compareCursor({ since: 1 }, { since: 2 })).toBeLessThan(0);
    expect(compareCursor({ since: 2 }, { since: 1 })).toBeGreaterThan(0);
    // A later batch wins whatever the books say.
    expect(compareCursor({ since: 2, sinceBook: B1 }, { since: 1, sinceBook: B9 })).toBeGreaterThan(0);
  });

  it("orders by book within a batch", () => {
    expect(compareCursor({ since: 5, sinceBook: B1 }, { since: 5, sinceBook: B9 })).toBeLessThan(0);
    expect(compareCursor({ since: 5, sinceBook: B9 }, { since: 5, sinceBook: B1 })).toBe(1);
    expect(compareCursor({ since: 5, sinceBook: B1 }, { since: 5, sinceBook: B1 })).toBe(0);
  });

  it("treats an absent book as the whole batch, above every book in it", () => {
    // The bug this exists to prevent: a REST page settles whole batches, so its
    // watermark has no book. Reading that as "book zero" made the next frame in the
    // same batch look newer, and the cursor moved BACKWARDS from "all of batch 5" to
    // "up to book 1 of batch 5" — after which the server re-sent the rest.
    expect(compareCursor({ since: 5, sinceBook: B9 }, { since: 5 })).toBeLessThan(0);
    expect(compareCursor({ since: 5 }, { since: 5, sinceBook: B9 })).toBeGreaterThan(0);
    expect(compareCursor({ since: 5 }, { since: 5 })).toBe(0);
  });

  it("treats a missing batch as the beginning", () => {
    // A fresh cursor, before any page or frame has landed.
    expect(compareCursor({}, { since: 1 })).toBeLessThan(0);
    expect(compareCursor({ since: 1, sinceBook: B1 }, {})).toBeGreaterThan(0);
  });
});

describe("compareCursor — already-delivered decisions", () => {
  /** What `onFrame` asks: is this frame at or behind where we already are? */
  const delivered = (frame: { batch: number; book: MarketId }, cursor: Parameters<typeof compareCursor>[1]) =>
    compareCursor({ since: frame.batch, sinceBook: frame.book }, cursor) <= 0;

  it("drops a frame inside a batch a REST page already settled", () => {
    expect(delivered({ batch: 5, book: B1 }, { since: 5 })).toBe(true);
    expect(delivered({ batch: 5, book: B9 }, { since: 5 })).toBe(true);
  });

  it("accepts the rest of a partly delivered batch, and drops what it already has", () => {
    expect(delivered({ batch: 5, book: B1 }, { since: 5, sinceBook: B1 })).toBe(true);
    expect(delivered({ batch: 5, book: B9 }, { since: 5, sinceBook: B1 })).toBe(false);
  });

  it("accepts a later batch, drops an earlier one", () => {
    expect(delivered({ batch: 6, book: B1 }, { since: 5, sinceBook: B9 })).toBe(false);
    expect(delivered({ batch: 4, book: B9 }, { since: 5 })).toBe(true);
  });
});

// --- the event channel's contracts, none of which the codec tests can see ---

/**
 * `OrderHistory` over a stub context: a REST page that resolves immediately and a
 * websocket whose `subscribe` hands us the frame callback, so a test can deliver a
 * frame the way the transport would.
 */
function harness() {
  let deliver: ((result: unknown) => void) | undefined;
  const ws = {
    state: "open",
    on: () => () => {},
    subscribe: (_channel: string, _params: unknown, onMessage: (r: unknown) => void) => {
      deliver = onMessage;
      return { unsubscribe: () => {}, update: () => {}, resubscribe: () => {} };
    },
  };
  const rest = {
    orders: async () => ({ orders: [], nextCursor: null, totalCount: 0, solutionNow: 0 }),
  };
  const history = new OrderHistory(
    { rest, ws, positionResyncMs: 0, marketResyncMs: 0 } as unknown as SyncContext,
    "0xabc" as Address,
  );
  return { history, frame: (f: unknown) => deliver?.(f), delivered: () => deliver !== undefined };
}

const FRAME = {
  book: `0x${"00".repeat(31)}07`,
  batch: 1_000_000,
  accts: ["0xabc"],
  orders: [{ id: "0xnew", tx: "0xtx", a: 0, n: 1, px: "1", sz: "1" }],
  events: [{ k: "new", o: 0 }],
};

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("OrderHistory.onEvent", () => {
  it("starts the stream on its own, without a snapshot subscriber", async () => {
    const { history, frame, delivered } = harness();
    const seen: OrderEvent[][] = [];
    const off = history.onEvent((events) => seen.push(events));
    await flush();

    // The resource is ref-counted from `subscribe`/`ready`. Listening has to count too,
    // or an event-only consumer waits forever — and today's app only worked because
    // something else happened to hold the same instance.
    expect(delivered(), "listening subscribed to the stream").toBe(true);
    frame(FRAME);
    expect(seen).toHaveLength(1);
    expect(seen[0]!.map((e) => e.kind)).toEqual(["new"]);
    off();
  });

  it("emits after the snapshot, so a listener reads the state its events produced", async () => {
    const { history, frame } = harness();
    let orderCountWhenNotified: number | undefined;
    const off = history.onEvent(() => { orderCountWhenNotified = history.get()?.length; });
    await flush();

    frame(FRAME);
    // Emitting before `rebuild()` would show the listener the previous snapshot — the
    // one without the order the event is about.
    expect(orderCountWhenNotified).toBe(1);
    off();
  });

  it("stops delivering once released, and survives a listener that throws", async () => {
    const { history, frame } = harness();
    const seen: string[] = [];
    const offThrower = history.onEvent(() => { throw new Error("consumer bug"); });
    const off = history.onEvent((events) => seen.push(...events.map((e) => e.kind)));
    await flush();

    // One listener's failure is its own, not the stream's.
    expect(() => frame(FRAME)).not.toThrow();
    expect(seen).toEqual(["new"]);

    off();
    frame({ ...FRAME, batch: 2_000_000, orders: [{ id: "0xtwo", tx: "0xtx", a: 0, n: 2, px: "1", sz: "1" }] });
    expect(seen).toEqual(["new"]);
    offThrower();
  });

  it("says nothing for the REST seed", async () => {
    const { history } = harness();
    const seen: OrderEvent[][] = [];
    const off = history.onEvent((events) => seen.push(events));
    await flush();

    // The seed is history, not transitions. A consumer that had to filter it would be
    // back to guessing which rows are new.
    expect(seen).toEqual([]);
    off();
  });
});
