// The stream position. A batch is delivered as one frame per book, so the position
// is a pair — and the whole of the `pod_orders_v2` resume contract rests on an
// absent book meaning "the whole batch", which sorts ABOVE every book in it.
//
// This is the mirror of `already_delivered` in `node/src/rpc/orders_v2.rs`:
// `(frame_batch, frame_book) <= (since, since_book.unwrap_or(0xff…))`. If the two
// sides disagree, the server re-sends frames the client has applied, and applying a
// frame twice appends its fills twice.

import { describe, expect, it } from "vitest";

import type { MarketId } from "../types/public.js";
import { compareCursor } from "./orders.js";

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
